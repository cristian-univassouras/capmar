import io
import time
from concurrent.futures import ThreadPoolExecutor

import jwt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app import crud, database, models, schemas
from app.config import Settings, settings
from app.main import app
from app.limits import consume
from app.security import hash_password, verify_password
from conftest import HEADERS, account


def image_bytes(size=(20, 20), fmt="PNG"):
    out = io.BytesIO()
    Image.new("RGB", size, "red").save(out, format=fmt)
    return out.getvalue()


def upload(client, data=None, mime="image/png"):
    return client.post("/upload", files={"file": ("sample.png", data or image_bytes(), mime)})


def project(client, private=True, **extra):
    response = client.post("/projects", json={"name": "Projeto", "visibility": not private, **extra})
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.parametrize("secret", [None, "", " ", "dev-secret-change-me", "short", "development" * 8])
def test_production_rejects_secret(secret):
    args = dict(_env_file=None, environment="production", cookie_secure=True,
                cors_origins="https://app.example.com",
                database_url="postgresql+psycopg2://user:pass@db/prod")
    if secret is not None:
        args["secret_key"] = secret
    with pytest.raises(ValidationError):
        Settings(**args)


@pytest.mark.parametrize("override", [
    {"cookie_secure": False}, {"cors_origins": "*"}, {"cors_origins": "http://app.example.com"},
    {"cors_origins": "https://app.example.com/path"}, {"cors_origins": ""},
])
def test_production_rejects_configuration(override):
    args = dict(_env_file=None, environment="production", secret_key="a9B7z2Q5" * 6,
                cookie_secure=True, cors_origins="https://app.example.com",
                database_url="postgresql+psycopg2://user:pass@db/prod")
    with pytest.raises(ValidationError):
        Settings(**(args | override))


def test_cookie_logout_revokes_server_session(client):
    result = client.post("/auth/register", json={"username": "owner", "email": "Owner@example.com", "password": "correct-password"})
    assert result.status_code == 201
    assert set(result.json()) == {"user"}
    cookie = result.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    token = client.cookies.get(settings.cookie_name)
    assert client.get("/auth/me").status_code == 200
    assert client.post("/auth/logout").status_code == 200
    client.cookies.set(settings.cookie_name, token)
    assert client.get("/auth/me").status_code == 401
    client.cookies.clear()
    assert client.get("/auth/me", headers={"Authorization": "Bearer " + token}).status_code == 401
    assert client.post("/auth/logout").status_code == 200


def test_secure_cookie_in_production(client, monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "cookie_secure", True)
    response = client.post("/auth/register", json={"username": "owner", "email": "owner@example.com", "password": "correct-password"})
    assert "Secure" in response.headers["set-cookie"]
    assert "HttpOnly" in response.headers["set-cookie"]


@pytest.mark.parametrize("kind", ["malformed", "expired", "deleted", "missing_claim"])
def test_invalid_sessions(client, kind):
    user = account(client)
    token = client.cookies.get(settings.cookie_name)
    payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    if kind == "malformed":
        token = "invalid"
    elif kind == "expired":
        payload["exp"] = int(time.time()) - 1
        token = jwt.encode(payload, settings.secret_key, algorithm="HS256")
    elif kind == "missing_claim":
        del payload["jti"]
        token = jwt.encode(payload, settings.secret_key, algorithm="HS256")
    else:
        with database.SessionLocal.begin() as db:
            db.delete(db.get(models.User, user["user_id"]))
    client.cookies.clear()
    client.cookies.set(settings.cookie_name, token)
    assert client.get("/auth/me").status_code == 401
    assert client.post("/projects", json={"name": "x"}).status_code == 401


def test_csrf_json_multipart_origins(client):
    account(client)
    assert client.post("/projects", json={"name": "ok"}).status_code == 201
    assert upload(client).status_code == 200
    for path in ("/projects", "/auth/logout", "/upload"):
        assert client.post(path, headers={"Origin": "https://evil.example"}, json={}).status_code == 403
        assert client.post(path, headers={"X-CSRF-Protection": ""}, json={}).status_code == 403
    assert client.get("/projects", headers={"Origin": "null"}).status_code == 403
    assert client.post("/projects", content='{"name":"x"}', headers={"Content-Type": "text/plain"}).status_code == 415
    response = client.options("/projects", headers={"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "X-CSRF-Protection,Content-Type"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == HEADERS["Origin"]


def test_private_matrix_and_public_email(client):
    owner = account(client)
    attachment = upload(client).json()["url"]
    private = project(client, cover_url=attachment)
    pid = private["project_id"]
    team = client.post("/teams", json={"team_name": "Equipe", "project_id": pid}).json()
    post = client.post("/posts", json={"content": "privado", "project_id": pid})
    assert post.status_code == 201
    assert client.post(f"/projects/{pid}/comments", json={"content": "interno"}).status_code == 201
    with TestClient(app, headers=HEADERS) as other:
        for logged_in in (False, True):
            if logged_in:
                outsider = account(other, "outsider")
            for path in (f"/projects/{pid}", f"/projects/{pid}/comments", f"/teams/{team['team_id']}", attachment):
                assert other.get(path).status_code == 404, path
            for path in ("/projects", "/teams", "/posts", f"/posts?user_id={owner['user_id']}"):
                assert other.get(path).json() == [], path
            assert other.post("/categories", json={"description": "hacked"}).status_code == (403 if logged_in else 401)
            assert "email" not in other.get(f"/users/{owner['user_id']}").json()
            assert all("email" not in u for u in other.get("/users").json())
        assert other.post("/teams", json={"team_name": "Invadida", "project_id": pid}).status_code == 404
        assert other.post("/posts", json={"content": "x", "project_id": pid}).status_code == 404
        assert other.post(f"/projects/{pid}/like", json={}).status_code == 404
        assert client.post(f"/teams/{team['team_id']}/members", json={"user_id": outsider["user_id"]}).status_code == 200
        for path in (f"/projects/{pid}", f"/projects/{pid}/comments", f"/teams/{team['team_id']}", attachment):
            assert other.get(path).status_code == 200, path
        assert other.post("/posts", json={"content": "x", "project_id": pid}).status_code == 403
        assert other.patch(f"/projects/{pid}", json={"name": "hack"}).status_code == 403
        assert client.delete(f"/teams/{team['team_id']}/members/{outsider['user_id']}").status_code == 200
        assert other.get(attachment).status_code == 404
        assert client.patch(f"/projects/{pid}", json={"visibility": True}).status_code == 200
        assert other.get(attachment).status_code == 200
        assert other.post("/teams", json={"team_name": "hack", "project_id": pid}).status_code == 403
        assert other.post("/posts", json={"content": "hack", "project_id": pid}).status_code == 403
    assert client.delete(f"/projects/{pid}").status_code == 204
    assert client.get("/posts").json() == []
    assert client.get(attachment).status_code == 404


def test_upload_validation_and_binding(client, monkeypatch):
    account(client)
    assert upload(client, b"<svg>bad</svg>").status_code == 400
    assert upload(client, b"x" * (5 * 1024 * 1024 + 1)).status_code == 413
    assert upload(client, image_bytes((8001, 1))).status_code == 400
    good = upload(client, mime="text/plain")
    assert good.status_code == 200  # formato real, não o MIME declarado
    url = good.json()["url"]
    assert client.get(url).headers["content-type"] == "image/webp"
    pid = project(client, cover_url=url)["project_id"]
    assert client.patch("/users/1", json={"avatar_url": url}).status_code == 409
    assert client.delete(url).status_code == 409
    with TestClient(app, headers=HEADERS) as other:
        account(other, "other")
        assert other.post("/projects", json={"name": "hack", "cover_url": url}).status_code == 403
        assert other.get("/projects").json() == []  # projeto do request com falha foi revertido
    assert client.patch(f"/projects/{pid}", json={"cover_url": None}).status_code == 200
    assert client.delete(url).status_code == 204
    monkeypatch.setattr(settings, "upload_quota_count", 1)
    assert upload(client).status_code == 200
    assert upload(client).status_code == 429
    with database.SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(models.Upload)) == 1


@pytest.mark.parametrize("payload", [{"name": None}, {"status": None}, {"visibility": None},
                                    {"status": "invalid"}, {"description": "x" * 10001}])
def test_patch_validation(client, payload):
    account(client)
    pid = project(client)["project_id"]
    assert client.patch(f"/projects/{pid}", json=payload).status_code == 422


def test_password_utf8_and_limits(client):
    prefix = "a" * 72
    hashed = hash_password(prefix)
    assert verify_password(prefix, hashed)
    assert not verify_password(prefix + "b", hashed)
    for password in ("a" * 73, "é" * 37):
        assert client.post("/auth/register", json={"username": "owner", "email": "owner@example.com", "password": password}).status_code == 422
    for path in ("/projects", "/teams", "/posts", "/users"):
        assert client.get(path + "?limit=101").status_code == 422
        assert client.get(path + "?skip=-1").status_code == 422
    account(client)
    assert client.post("/posts", json={"content": "x" * 5001}).status_code == 422
    assert client.post("/posts", content=b"x" * 65537, headers={"Content-Type": "application/json"}).status_code == 413


def test_login_limit_is_shared_and_persists_failure(client, monkeypatch):
    monkeypatch.setattr(settings, "login_limit", 2)
    for _ in range(2):
        assert client.post("/auth/login", json={"email": "absent@example.com", "password": "wrong"}).status_code == 401
    with TestClient(app, headers=HEADERS) as other:
        response = other.post("/auth/login", json={"email": "absent@example.com", "password": "wrong"})
        assert response.status_code == 429
        assert int(response.headers["retry-after"]) > 0


def test_atomic_rate_counter():
    def attempt(_):
        try:
            consume("parallel-test", 5, 60)
            return 200
        except HTTPException as exc:
            return exc.status_code
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(attempt, range(12)))
    assert results.count(200) == 5
    assert results.count(429) == 7


def test_commit_failure_never_sends_success(client, monkeypatch):
    account(client)
    original = database.SessionLocal.class_.commit
    def fail_commit(db):
        if db.scalar(select(func.count()).select_from(models.Project)) > 0:
            raise IntegrityError("commit failure", {}, Exception("deferred constraint"))
        return original(db)
    monkeypatch.setattr(database.SessionLocal.class_, "commit", fail_commit)
    response = client.post("/projects", json={"name": "rollback"})
    assert response.status_code == 409, response.text
    with database.SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(models.Project)) == 0


def test_composite_team_rollback(client, monkeypatch):
    account(client)
    pid = project(client)["project_id"]
    original = crud.create_team
    def fail_after_flush(*args, **kwargs):
        original(*args, **kwargs)
        raise IntegrityError("membership failure", {}, Exception("simulated"))
    monkeypatch.setattr(crud, "create_team", fail_after_flush)
    response = client.post("/teams", json={"team_name": "rollback", "project_id": pid})
    assert response.status_code == 409
    with database.SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(models.Team)) == 0
        assert db.scalar(select(func.count()).select_from(models.team_users)) == 0


def test_quota_is_atomic_between_connections(client, monkeypatch):
    account(client)
    token = client.cookies.get(settings.cookie_name)
    monkeypatch.setattr(settings, "upload_quota_count", 1)
    def attempt(_):
        with TestClient(app, headers=HEADERS) as parallel:
            parallel.cookies.set(settings.cookie_name, token)
            return upload(parallel).status_code
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(attempt, range(4)))
    assert results.count(200) == 1
    assert results.count(429) == 3


def test_orphan_cleanup_preserves_referenced_private_media(client):
    from app.maintenance import cleanup
    account(client)
    orphan = upload(client).json()["url"]
    kept = upload(client).json()["url"]
    pid = project(client, cover_url=kept)["project_id"]
    with database.SessionLocal.begin() as db:
        for item in db.scalars(select(models.Upload)):
            item.created_at = int(time.time()) - 172800
    assert cleanup() == 1
    assert client.get(orphan).status_code == 404
    assert client.get(kept).status_code == 200
    assert client.delete(f"/projects/{pid}").status_code == 204
    assert cleanup() == 1


def test_legacy_media_import_is_private_atomic_and_repeatable(client, tmp_path, monkeypatch):
    from app.maintenance import import_legacy
    account(client)
    pid = project(client)["project_id"]
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))
    (tmp_path / "legacy.png").write_bytes(image_bytes())
    with database.SessionLocal.begin() as db:
        db.get(models.Project, pid).cover_url = "/uploads/legacy.png"
    assert client.get("/uploads/legacy.png").status_code == 404
    assert import_legacy() == (1, 0)
    assert import_legacy() == (0, 0)
    url = client.get(f"/projects/{pid}").json()["cover_url"]
    assert client.get(url).status_code == 200
    with TestClient(app, headers=HEADERS) as guest:
        assert guest.get(url).status_code == 404
    assert (tmp_path / "legacy.png").exists()


def test_project_member_and_leader_matrix(client):
    account(client)
    pid = project(client)["project_id"]
    tid = client.post("/teams", json={"team_name": "Equipe", "project_id": pid}).json()["team_id"]
    with TestClient(app, headers=HEADERS) as collaborator:
        member = account(collaborator, "member")
        with database.SessionLocal.begin() as db:
            owned_project = db.get(models.Project, pid)
            owned_project.members.append(db.get(models.User, member["user_id"]))
        assert collaborator.get(f"/projects/{pid}").status_code == 200
        assert collaborator.get(f"/teams/{tid}").status_code == 200
        assert collaborator.post("/posts", json={"project_id": pid, "content": "x"}).status_code == 403
        with database.SessionLocal.begin() as db:
            db.get(models.Team, tid).leader_id = member["user_id"]
        assert collaborator.post("/posts", json={"project_id": pid, "content": "autorizado"}).status_code == 201
        assert collaborator.patch(f"/teams/{tid}", json={"team_name": "Nova"}).status_code == 200
        assert collaborator.post("/teams", json={"project_id": pid, "team_name": "Extra"}).status_code == 403


def test_upload_animation_rejected(client):
    account(client)
    out = io.BytesIO()
    Image.new("RGB", (10, 10), "red").save(out, format="GIF", save_all=True,
        append_images=[Image.new("RGB", (10, 10), "blue")], duration=100, loop=0)
    assert upload(client, out.getvalue()).status_code == 400


def test_chunked_request_body_is_bounded():
    import asyncio
    from app.middleware import RequestProtection
    reached = False
    responses = []
    async def downstream(scope, receive, send):
        nonlocal reached
        reached = True
    chunks = iter([
        {"type": "http.request", "body": b"x" * 40000, "more_body": True},
        {"type": "http.request", "body": b"x" * 40000, "more_body": False},
    ])
    async def receive():
        return next(chunks)
    async def send(message):
        responses.append(message)
    scope = {"type": "http", "method": "POST", "path": "/posts",
             "headers": [(b"x-csrf-protection", b"1"), (b"content-type", b"application/json")]}
    asyncio.run(RequestProtection(downstream)(scope, receive, send))
    assert not reached
    assert responses[0]["status"] == 413


def test_register_and_write_limits(client, monkeypatch):
    monkeypatch.setattr(settings, "register_limit", 1)
    account(client)
    response = client.post("/auth/register", json={"username": "another", "email": "another@example.com", "password": "correct-password"})
    assert response.status_code == 429
    monkeypatch.setattr(settings, "write_limit", 1)
    assert client.post("/posts", json={"content": "first"}).status_code == 201
    assert client.post("/posts", json={"content": "second"}).status_code == 429


def test_real_deferred_constraint_fails_before_response(client, monkeypatch):
    from sqlalchemy import text
    account(client)
    with database.engine.begin() as conn:
        fk = next(k for k in __import__("sqlalchemy").inspect(conn).get_foreign_keys("project")
                  if k["constrained_columns"] == ["owner_id"])
        conn.execute(text(f'ALTER TABLE project ALTER CONSTRAINT "{fk["name"]}" DEFERRABLE INITIALLY DEFERRED'))
    original = crud.create_project
    def deferred_violation(db, *args, **kwargs):
        result = original(db, *args, **kwargs)
        db.execute(text("UPDATE project SET owner_id=999999 WHERE project_id=:pid"), {"pid": result.project_id})
        return result
    monkeypatch.setattr(crud, "create_project", deferred_violation)
    try:
        response = client.post("/projects", json={"name": "deferred"})
        assert response.status_code == 409
        with database.SessionLocal() as db:
            assert db.scalar(select(func.count()).select_from(models.Project)) == 0
    finally:
        with database.engine.begin() as conn:
            conn.execute(text(f'ALTER TABLE project ALTER CONSTRAINT "{fk["name"]}" NOT DEFERRABLE'))
