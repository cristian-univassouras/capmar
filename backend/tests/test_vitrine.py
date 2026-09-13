from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app import database, models
from app.config import settings
from app.main import app
from conftest import HEADERS, account


def test_keywords_normalize_persist_patch_and_limits(client):
    account(client)
    response = client.post("/projects", json={"name": "Tags", "keywords": [" Maricá ", "MARICÁ", "  Horta   Urbana ", "Ｃａｆé"]})
    assert response.status_code == 201, response.text
    pid = response.json()["project_id"]
    assert [tag["word"] for tag in response.json()["keywords"]] == ["café", "horta urbana", "maricá"]
    assert client.get(f"/projects/{pid}").json()["keywords"] == response.json()["keywords"]
    assert client.patch(f"/projects/{pid}", json={"description": "Nova"}).json()["keywords"] == response.json()["keywords"]
    for keywords in (None, ["x" * 21], [" "], ["\u200b"], [str(i) for i in range(9)]):
        assert client.patch(f"/projects/{pid}", json={"keywords": keywords}).status_code == 422
    assert client.patch(f"/projects/{pid}", json={"keywords": []}).json()["keywords"] == []
    assert client.get(f"/projects/{pid}").json()["keywords"] == []


def test_keywords_and_project_roll_back_on_invalid_media(client):
    account(client)
    response = client.post("/projects", json={"name": "Rollback", "keywords": ["atomicidade"], "cover_url": "https://invalid.example/image.jpg"})
    assert response.status_code == 422
    with database.SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(models.Project)) == 0
        assert db.scalar(select(func.count()).select_from(models.Keyword).where(models.Keyword.word == "atomicidade")) == 0
        assert db.scalar(select(func.count()).select_from(models.projects_keywords)) == 0


def test_simultaneous_keyword_creation_and_replacement(client):
    account(client)
    token = client.cookies.get(settings.cookie_name)
    def create(index):
        with TestClient(app, headers=HEADERS) as worker:
            worker.cookies.set(settings.cookie_name, token)
            return worker.post("/projects", json={"name": "Concorrente " + str(index), "keywords": ["comum", "maricá"]})
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(pool.map(create, range(4)))
    assert all(response.status_code == 201 for response in responses), [r.text for r in responses]
    with database.SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(models.Keyword).where(models.Keyword.word.in_(["comum", "maricá"]))) == 2
    pid = responses[0].json()["project_id"]
    def replace(words):
        with TestClient(app, headers=HEADERS) as worker:
            worker.cookies.set(settings.cookie_name, token)
            return worker.patch(f"/projects/{pid}", json={"keywords": words})
    with ThreadPoolExecutor(max_workers=2) as pool:
        updates = list(pool.map(replace, (["horta", "verde"], ["arte", "azul"])))
    assert all(response.status_code == 200 for response in updates)
    words = [tag["word"] for tag in client.get(f"/projects/{pid}").json()["keywords"]]
    assert words in (["horta", "verde"], ["arte", "azul"])


def test_combined_search_filters_visibility_before_pagination(client):
    user = account(client)
    with database.SessionLocal.begin() as db:
        db.add_all([models.Project(name=f"Maricá {i}", description="Pesquisa comunitária",
                                  status="ativo", visibility=True, category_id=1, owner_id=user["user_id"])
                    for i in range(105)])
        db.add_all([models.Project(name=f"Maricá outra {i}", status="ativo", visibility=True, category_id=2)
                    for i in range(8)])
        db.add_all([models.Project(name=f"Maricá segredo {i}", status="ativo", visibility=False, category_id=1, owner_id=user["user_id"])
                    for i in range(8)])
    with TestClient(app, headers=HEADERS) as visitor:
        ids = []
        for offset in range(0, 105, 20):
            response = visitor.get("/projects/search", params={"q": "MARICA", "category_id": 1, "skip": offset, "limit": 20})
            assert response.status_code == 200, response.text
            body = response.json()
            assert body["total"] == 105
            ids.extend(item["project_id"] for item in body["items"])
            assert all(item["visibility"] for item in body["items"])
        assert len(ids) == len(set(ids)) == 105
        assert visitor.get("/projects/search", params={"q": "inexistente", "category_id": 1}).json()["total"] == 0
    assert client.get("/projects/search", params={"q": "marica", "category_id": 1}).json()["total"] == 113
    assert client.get("/projects/search", params={"q": "marica", "category_id": 1, "public_only": True}).json()["total"] == 105


def test_search_keywords_literal_wildcards_and_public_owner_profile(client):
    owner = account(client)
    response = client.post("/projects", json={"name": "Projeto A", "keywords": ["educação", "educação digital"]})
    assert response.status_code == 201
    client.post("/projects", json={"name": "Taxa 20% de materiais", "visibility": True})
    private = client.post("/projects", json={"name": "Oculto", "visibility": False, "keywords": ["sigiloso"]}).json()
    with TestClient(app, headers=HEADERS) as visitor:
        result = visitor.get("/projects/search", params={"q": "educacao"}).json()
        assert result["total"] == 1  # Duas tags não duplicam projeto.
        assert visitor.get("/projects/search", params={"q": "20%"}).json()["total"] == 1
        assert visitor.get("/projects/search", params={"q": "sigiloso"}).json()["total"] == 0
        assert visitor.get(f"/projects/{private['project_id']}").status_code == 404
        assert visitor.get("/projects/search", params={"public_only": True, "owner_id": owner["user_id"]}).json()["total"] == 2
        for query in ({"q": "a"}, {"q": "x" * 101}, {"skip": -1}, {"limit": 101}, {"category_id": -1}):
            assert visitor.get("/projects/search", params=query).status_code == 422
        assert visitor.post("/projects", json={"name": "Sem login", "keywords": ["tag"]}).status_code == 401
