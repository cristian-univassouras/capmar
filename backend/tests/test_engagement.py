import time
import uuid
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError
from starlette.websockets import WebSocketDisconnect
from app import models, database
from app.main import app
from app.mfa import cipher, generate_secret, totp
from conftest import account, HEADERS


def test_totp_rfc6238_sha1_vector():
    import base64
    secret = base64.b32encode(b"12345678901234567890").decode()
    # RFC 6238, t=59 s: 94287082 com 8 dígitos; os 6 finais são 287082.
    assert totp(secret, 59 // 30) == "287082"


def test_socket_quota_and_release():
    from contextlib import ExitStack
    alice, _ = client_for("alice")
    _, bob = client_for("bob")
    cid = alice.post("/chat/conversations", json={"title": "Cota", "participant_ids": [bob["user_id"]]}).json()["conversation_id"]
    with ExitStack() as stack:
        sockets = [stack.enter_context(alice.websocket_connect(f"/chat/ws/{cid}", headers={"Origin": "http://localhost:3000"})) for _ in range(3)]
        for ws in sockets: ws.receive_json()
        with pytest.raises(WebSocketDisconnect):
            with alice.websocket_connect(f"/chat/ws/{cid}", headers={"Origin": "http://localhost:3000"}): pass
    with database.SessionLocal() as db:
        assert list(db.scalars(select(models.ChatLease))) == []


def client_for(name):
    client = TestClient(app, headers=HEADERS)
    user = account(client, name)
    return client, user


def make_admin(name="administrator"):
    client, user = client_for(name)
    secret = generate_secret()
    with database.SessionLocal.begin() as db:
        row = db.get(models.User, user["user_id"])
        row.mfa_secret = cipher().encrypt(secret.encode()).decode()
        row.role = "admin"
    result = client.post("/auth/login", json={"email": name + "@example.com", "password": "correct-password", "otp": totp(secret, int(time.time()) // 30 - 1)})
    assert result.status_code == 200, result.text
    return client, user, secret


def test_admin_permissions_mfa_and_revocation(client):
    assert client.get("/admin/users").status_code == 401
    normal = account(client)
    assert client.get("/admin/users").status_code == 403
    assert client.patch(f'/users/{normal["user_id"]}', json={"role": "admin"}).status_code == 422
    admin, owner, secret = make_admin()
    assert admin.get("/admin/users").status_code == 200
    assert admin.patch(f'/admin/users/{owner["user_id"]}', json={"role": "user", "is_active": False, "reason": "Teste da proteção"}).status_code == 409
    assert admin.patch(f'/admin/users/{normal["user_id"]}', json={"role": "admin", "is_active": True, "reason": "Sem MFA habilitado"}).status_code == 409
    response = admin.patch(f'/admin/users/{normal["user_id"]}', json={"role": "user", "is_active": False, "reason": "Suspensão de teste"})
    assert response.status_code == 200
    assert client.get("/auth/me").status_code == 401
    assert client.post("/auth/login", json={"email": "owner@example.com", "password": "correct-password"}).status_code == 401
    events = admin.get("/admin/audit").json()
    assert any(e["action"] == "admin.user.update" and e["target_id"] == normal["user_id"] for e in events)
    assert secret not in str(events) and "correct-password" not in str(events)
    with database.SessionLocal.begin() as db:
        db.execute(text("UPDATE auth_sessions SET admin_verified_until=0"))
    assert admin.get("/admin/users").status_code == 403
    assert admin.post("/auth/reauthenticate", json={"password": "correct-password", "otp": totp(secret)}).status_code == 200
    assert admin.get("/admin/users").status_code == 200


def test_mfa_setup_confirmation_replay_and_password(client):
    user = account(client)
    setup = client.post("/auth/mfa/setup", json={"password": "correct-password"})
    assert setup.status_code == 200
    secret = setup.json()["secret"]
    assert secret not in client.get("/auth/me").text
    assert client.post("/auth/mfa/confirm", json={"password": "correct-password", "otp": totp(secret, int(time.time()) // 30 - 1)}).status_code == 200
    assert client.get("/auth/me").status_code == 401
    assert client.post("/auth/login", json={"email": "owner@example.com", "password": "correct-password"}).status_code == 403
    code = totp(secret)
    assert client.post("/auth/login", json={"email": "owner@example.com", "password": "correct-password", "otp": code}).status_code == 200
    assert client.post("/auth/login", json={"email": "owner@example.com", "password": "correct-password", "otp": code}).status_code == 403
    assert client.post("/auth/password", json={"password": "wrong", "new_password": "a-better-password", "otp": code}).status_code == 403
    # Próximo passo válido (janela +1 permitida); a senha nunca vai para auditoria.
    assert client.post("/auth/password", json={"password": "correct-password", "new_password": "a-better-password", "otp": totp(secret, int(time.time()) // 30 + 1)}).status_code == 200
    assert client.get("/auth/me").status_code == 401
    with database.SessionLocal() as db:
        assert db.get(models.User, user["user_id"]).mfa_secret != secret


def test_moderation_filters_feed_and_media_and_audit(client):
    account(client)
    import io
    from PIL import Image
    output = io.BytesIO(); Image.new("RGB", (8, 8), "purple").save(output, "PNG")
    upload = client.post("/upload", files={"file": ("test.png", output.getvalue(), "image/png")}).json()["url"]
    post = client.post("/posts", json={"content": "Conteúdo para moderar", "image_url": upload}).json()
    admin, _, _ = make_admin()
    assert client.patch(f'/admin/posts/{post["post_id"]}', json={"is_hidden": True, "reason": "Sem permissão"}).status_code == 403
    assert admin.patch(f'/admin/posts/{post["post_id"]}', json={"is_hidden": True, "reason": "Violação de regras"}).status_code == 200
    assert client.get("/posts").json() == []
    assert client.get(upload).status_code == 404
    assert admin.get("/admin/posts").json()["items"][0]["is_hidden"] is True
    assert admin.patch(f'/admin/posts/{post["post_id"]}', json={"is_hidden": False, "reason": "Revisão aprovada"}).status_code == 200
    assert len(client.get("/posts").json()) == 1
    with database.SessionLocal.begin() as db:
        with pytest.raises(DBAPIError):
            with db.begin_nested(): db.execute(text("DELETE FROM audit_logs"))
        with pytest.raises(DBAPIError):
            with db.begin_nested(): db.execute(text("UPDATE audit_logs SET reason='alterado'"))


def test_admin_change_rolls_back_when_audit_fails(client, monkeypatch):
    user = account(client)
    admin, _, _ = make_admin()
    from app.routers import admin as router
    def fail(*args, **kwargs): raise RuntimeError("Falha controlada de auditoria")
    monkeypatch.setattr(router, "record", fail)
    with pytest.raises(RuntimeError):
        admin.patch(f'/admin/users/{user["user_id"]}', json={"role": "user", "is_active": False, "reason": "Teste transacional"})
    with database.SessionLocal() as db:
        assert db.get(models.User, user["user_id"]).is_active
    assert client.get("/auth/me").status_code == 200


def test_concurrent_admin_demotion_keeps_admin():
    first, a, _ = make_admin("firstadmin")
    second, b, _ = make_admin("secondadmin")
    payload = {"role": "user", "is_active": True, "reason": "Mudança concorrente"}
    with ThreadPoolExecutor(2) as pool:
        one = pool.submit(first.patch, f'/admin/users/{b["user_id"]}', json=payload)
        two = pool.submit(second.patch, f'/admin/users/{a["user_id"]}', json=payload)
        codes = [one.result().status_code, two.result().status_code]
    assert codes.count(200) == 1
    assert any(c in (401, 403) for c in codes)
    with database.SessionLocal() as db:
        assert len(list(db.scalars(select(models.User).where(models.User.role == "admin", models.User.is_active)))) == 1


def test_chat_access_reconnect_and_idempotency():
    alice, a = client_for("alice")
    bob, b = client_for("bob")
    outsider, _ = client_for("outsider")
    created = alice.post("/chat/conversations", json={"title": "Equipe", "participant_ids": [b["user_id"]]})
    assert created.status_code == 201
    cid = created.json()["conversation_id"]
    assert len(bob.get("/chat/conversations").json()) == 1
    assert outsider.get("/chat/conversations").json() == []
    assert outsider.get(f"/chat/conversations/{cid}/messages").status_code == 404
    payload = {"content": "Mensagem persistente", "client_id": str(uuid.uuid4())}
    with bob.websocket_connect(f"/chat/ws/{cid}", headers={"Origin": "http://localhost:3000"}) as ws:
        assert ws.receive_json()["items"] == []
        response = alice.post(f"/chat/conversations/{cid}/messages", json=payload)
        assert response.status_code == 201
        mid = response.json()["message_id"]
        batch = ws.receive_json()
        assert batch["items"][0]["content"] == payload["content"]
    assert alice.post(f"/chat/conversations/{cid}/messages", json=payload).json()["message_id"] == mid
    assert alice.post(f"/chat/conversations/{cid}/messages", json={**payload, "content": "Outra mensagem"}).status_code == 409
    assert len(bob.get(f"/chat/conversations/{cid}/messages").json()) == 1
    with bob.websocket_connect(f"/chat/ws/{cid}?after={mid}", headers={"Origin": "http://localhost:3000"}) as ws:
        assert ws.receive_json()["items"] == []
    for client, origin in [(outsider, "http://localhost:3000"), (bob, "https://evil.example"), (bob, "null")]:
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/chat/ws/{cid}", headers={"Origin": origin}): pass
    with bob.websocket_connect(f"/chat/ws/{cid}", headers={"Origin": "http://localhost:3000"}) as ws:
        ws.receive_json()
        bob.post("/auth/logout")
        with pytest.raises(WebSocketDisconnect): ws.receive_json()


def test_chat_validation_limits_and_concurrent_send():
    alice, _ = client_for("alice")
    bob, b = client_for("bob")
    cid = alice.post("/chat/conversations", json={"title": "Conversa", "participant_ids": [b["user_id"]]}).json()["conversation_id"]
    assert alice.post(f"/chat/conversations/{cid}/messages", json={"content": " " * 8, "client_id": str(uuid.uuid4())}).status_code == 422
    assert alice.post(f"/chat/conversations/{cid}/messages", json={"content": "x" * 2001, "client_id": str(uuid.uuid4())}).status_code == 422
    payload = {"content": "Só uma vez", "client_id": str(uuid.uuid4())}
    with ThreadPoolExecutor(2) as pool:
        futures = [pool.submit(alice.post, f"/chat/conversations/{cid}/messages", json=payload) for _ in range(2)]
        ids = [f.result().json()["message_id"] for f in futures]
    assert ids[0] == ids[1]
    for _ in range(28):
        assert alice.post(f"/chat/conversations/{cid}/messages", json={"content": "Olá", "client_id": str(uuid.uuid4())}).status_code == 201
    assert alice.post(f"/chat/conversations/{cid}/messages", json={"content": "Limite", "client_id": str(uuid.uuid4())}).status_code == 429
    items = bob.get(f"/chat/conversations/{cid}/messages?limit=10").json()
    older = bob.get(f'/chat/conversations/{cid}/messages?before={items[0]["message_id"]}&limit=100').json()
    assert len(items) + len(older) == 29


@pytest.mark.parametrize("url", ["javascript:alert(1)", "http://example.com", "https://localhost", "https://127.0.0.1", "https://example.com:444", "https://user:pass@example.com", "https://example.com\\@evil.com", "https://example.com/\nsecret"])
def test_reject_funding_urls(client, url):
    account(client)
    assert client.post("/projects", json={"name": "Apoio", "funding_url": url}).status_code == 422


def test_authorship_funding_owner_only(client):
    owner = account(client)
    assert client.post("/projects", json={"name": "Grupo", "authorship": "group"}).status_code == 422
    data = {"name": "Grupo", "authorship": "group", "responsible_names": "Ana e Bruno", "funding_url": "https://example.com/apoio", "funding_description": "Compra de materiais"}
    result = client.post("/projects", json=data)
    assert result.status_code == 201
    pid = result.json()["project_id"]
    assert client.get(f"/projects/{pid}").json()["responsible_names"] == "Ana e Bruno"
    assert client.patch(f"/projects/{pid}", json={"responsible_names": None}).status_code == 422
    stranger, _ = client_for("stranger")
    assert stranger.patch(f"/projects/{pid}", json={"funding_url": None}).status_code == 403
    assert client.patch(f"/projects/{pid}", json={"funding_url": None, "authorship": "individual", "responsible_names": None}).status_code == 200
