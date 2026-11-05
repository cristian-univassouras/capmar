import hashlib
import io
import time
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter, PdfReader
from sqlalchemy import select, update

from app import models, database, recovery
from app.presentation import video_url
from app.main import app


def test_vimeo_privacy_link_is_preserved():
    expected = "https://player.vimeo.com/video/76979871?h=8272103f6e"
    assert video_url("https://vimeo.com/76979871/8272103f6e") == expected
    assert video_url(expected) == expected
    assert video_url("https://vimeo.com/19231868") == "https://player.vimeo.com/video/19231868"
from app.config import settings
from app.maintenance import cleanup
from app.mfa import cipher, generate_secret, totp
from conftest import account, HEADERS
from test_security import upload


def pdf_bytes():
    out = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.add_js("app.alert('no')")
    writer.write(out)
    return out.getvalue()


def test_portfolio_persistence_privacy_types_and_cleanup(client):
    account(client)
    image = upload(client).json()["url"]
    result = client.post("/upload/document", files={"file": ("teste.pdf", pdf_bytes(), "application/pdf")})
    assert result.status_code == 200, result.text
    pdf = result.json()["url"]
    items = [{"kind": "image", "title": "Galeria", "url": image}, {"kind": "pdf", "title": "Plano", "url": pdf},
             {"kind": "video", "title": "Vídeo", "url": "https://youtu.be/dQw4w9WgXcQ"}]
    result = client.post("/projects", json={"name": "Portfólio", "template": "criativo", "accent": "laranja", "portfolio": items,
        "partners": [{"name": "Instituição", "url": "https://example.org"}]})
    assert result.status_code == 201, result.text
    pid = result.json()["project_id"]
    result = client.get(f"/projects/{pid}").json()
    assert result["portfolio"][2]["url"] == "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    assert result["partners"][0]["name"] == "Instituição"
    assert client.patch(f"/projects/{pid}", json={"description": "Mantém materiais"}).json()["portfolio"] == result["portfolio"]
    assert client.patch(f"/projects/{pid}", json={"cover_url": pdf}).status_code == 422
    assert client.get(f"/projects/{pid}").json()["cover_url"] is None
    visitor = TestClient(app, headers=HEADERS)
    assert visitor.get(image).status_code == 200
    response = visitor.get(pdf)
    assert response.status_code == 200
    assert "attachment" in response.headers["content-disposition"]
    parsed = PdfReader(io.BytesIO(response.content))
    assert "/Names" not in parsed.trailer["/Root"] and "/OpenAction" not in parsed.trailer["/Root"]
    with database.SessionLocal.begin() as db:
        db.execute(update(models.Upload).values(created_at=0))
    cleanup()
    assert visitor.get(pdf).status_code == 200  # referências de portfólio não são órfãs
    assert client.patch(f"/projects/{pid}", json={"visibility": False}).status_code == 200
    assert visitor.get(pdf).status_code == visitor.get(image).status_code == 404
    other = TestClient(app, headers=HEADERS); account(other, "other")
    assert other.patch(f"/projects/{pid}", json={"partners": []}).status_code in (403, 404)
    assert other.post("/projects", json={"name": "Roubo", "portfolio": items}).status_code == 403
    assert client.patch(f"/projects/{pid}", json={"portfolio": []}).status_code == 200
    with database.SessionLocal.begin() as db:
        db.execute(update(models.Upload).values(created_at=0))
    cleanup()
    assert client.get(pdf).status_code == 404


@pytest.mark.parametrize("extra", [
    {"portfolio": [{"kind": "video", "title": "X", "url": "https://evil.example/embed/x"}]},
    {"partners": [{"name": "X", "url": "javascript:alert(1)"}]},
    {"template": "custom-css"}, {"accent": None}, {"portfolio": None},
    {"portfolio": [{"kind": "pdf", "title": " ", "url": "/uploads/" + "a" * 32}]},
    {"partners": [{"name": "X"}] * 9},
])
def test_invalid_presentation_is_rejected(client, extra):
    account(client)
    assert client.post("/projects", json={"name": "Inválido", **extra}).status_code == 422


def test_invalid_document_and_mismatched_media(client):
    account(client)
    assert client.post("/upload/document", files={"file": ("fake.pdf", b"%PDF-malformed", "application/pdf")}).status_code == 400
    assert client.post("/upload/document", files={"file": ("huge.pdf", b"x" * (5 * 1024 * 1024 + 1), "application/pdf")}).status_code == 413
    image = upload(client).json()["url"]
    assert client.post("/projects", json={"name": "Mismatch", "portfolio": [{"kind": "pdf", "title": "PDF falso", "url": image}]}).status_code == 422


def request_token(client, monkeypatch):
    sent = []
    def deliver(email, token):
        # SMTP só recebe o link depois que o token está confirmado e visível
        # em outra conexão, nunca com a transação de criação ainda aberta.
        with database.SessionLocal() as db:
            entry = db.get(models.PasswordReset, hashlib.sha256(token.encode()).hexdigest())
            assert entry is not None and entry.email == email
        sent.append((email, token))
    monkeypatch.setattr(recovery, "send_reset", deliver)
    result = client.post("/auth/forgot-password", json={"email": "owner@example.com"})
    assert result.status_code == 200
    return sent[0][1]


def test_recovery_generic_response_single_use_and_revocation(client, monkeypatch):
    user = account(client)
    old_session = client.cookies.get(settings.cookie_name)
    token = request_token(client, monkeypatch)
    generic = client.post("/auth/forgot-password", json={"email": "unknown@example.com"})
    assert generic.json() == recovery.GENERIC
    with database.SessionLocal() as db:
        entry = db.scalar(select(models.PasswordReset))
        assert entry.token_hash == hashlib.sha256(token.encode()).hexdigest() and entry.token_hash != token
    payload = {"token": token, "password": "new-correct-password"}
    assert client.post("/auth/reset-password", json=payload).status_code == 200
    client.cookies.set(settings.cookie_name, old_session)
    assert client.get("/auth/me").status_code == 401
    assert client.post("/auth/reset-password", json=payload).status_code == 400
    assert client.post("/auth/login", json={"email": user["email"], "password": "correct-password"}).status_code == 401
    assert client.post("/auth/login", json={"email": user["email"], "password": payload["password"]}).status_code == 200


def test_recovery_expired_superseded_and_smtp_failure(client, monkeypatch):
    account(client)
    old = request_token(client, monkeypatch)
    token = request_token(client, monkeypatch)
    assert client.post("/auth/reset-password", json={"token": old, "password": "new-correct-password"}).status_code == 400
    with database.SessionLocal.begin() as db:
        db.execute(update(models.PasswordReset).values(expires_at=0))
    assert client.post("/auth/reset-password", json={"token": token, "password": "new-correct-password"}).status_code == 400
    def fail(*args):
        raise OSError("SMTP indisponível")
    monkeypatch.setattr(recovery, "send_reset", fail)
    assert client.post("/auth/forgot-password", json={"email": "owner@example.com"}).json() == recovery.GENERIC


def test_recovery_preserves_and_requires_mfa(client, monkeypatch):
    user = account(client)
    secret = generate_secret()
    with database.SessionLocal.begin() as db:
        db.get(models.User, user["user_id"]).mfa_secret = cipher().encrypt(secret.encode()).decode()
    token = request_token(client, monkeypatch)
    payload = {"token": token, "password": "new-correct-password"}
    assert client.post("/auth/reset-password", json=payload).status_code == 403
    assert client.post("/auth/reset-password", json={**payload, "otp": totp(secret)}).status_code == 200
    assert client.post("/auth/login", json={"email": user["email"], "password": payload["password"]}).status_code == 403


def test_recovery_concurrent_use_only_one_succeeds(client, monkeypatch):
    account(client)
    token = request_token(client, monkeypatch)
    def attempt(_):
        with TestClient(app, headers=HEADERS) as c:
            return c.post("/auth/reset-password", json={"token": token, "password": "new-correct-password"}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(attempt, range(2))) == [200, 400]
