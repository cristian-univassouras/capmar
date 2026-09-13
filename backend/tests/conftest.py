import os

import pytest

# Banco descartável obrigatório; jamais usar DATABASE_URL da aplicação implicitamente.
url = os.environ.get("TEST_DATABASE_URL")
if not url or not url.split("?")[0].endswith("/capmar_test"):
    raise RuntimeError("Defina TEST_DATABASE_URL apontando para um PostgreSQL descartável chamado capmar_test")
os.environ["DATABASE_URL"] = url
os.environ["ENVIRONMENT"] = "test"

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from app import database
from app.main import app

HEADERS = {"Origin": "http://localhost:3000", "X-CSRF-Protection": "1"}


@pytest.fixture(scope="session", autouse=True)
def migrated():
    command.upgrade(Config("alembic.ini"), "head")


@pytest.fixture(autouse=True)
def clean_db(migrated):
    with database.engine.begin() as conn:
        conn.execute(text("TRUNCATE users, project, team, post, project_comments, project_likes, auth_sessions, media_uploads, rate_buckets RESTART IDENTITY CASCADE"))


@pytest.fixture
def client():
    with TestClient(app, headers=HEADERS) as client:
        yield client


def account(client, name="owner"):
    response = client.post("/auth/register", json={
        "username": name, "email": name + "@example.com", "password": "correct-password",
    })
    assert response.status_code == 201, response.text
    return response.json()["user"]
