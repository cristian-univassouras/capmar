from fastapi.testclient import TestClient
from app import database, models
from app.main import app
from conftest import account, HEADERS

def test_writable_projects_match_owner_and_leader_and_filter_before_paging(client):
    owner = account(client)
    mine = client.post("/projects", json={"name": "Meu projeto"}).json()["project_id"]
    other = TestClient(app, headers=HEADERS)
    person = account(other, "other")
    theirs = other.post("/projects", json={"name": "Projeto alheio"}).json()["project_id"]
    led = other.post("/projects", json={"name": "Liderança autorizada", "visibility": False}).json()["project_id"]
    team = other.post("/teams", json={"team_name": "Equipe", "project_id": led}).json()["team_id"]
    with database.SessionLocal.begin() as db:
        db.get(models.Team, team).leader_id = owner["user_id"]
    result = client.get("/projects/search?writable_only=true&limit=1").json()
    assert result["total"] == 2
    assert result["items"][0]["project_id"] == led
    result = client.get("/projects?writable_only=true").json()
    assert {p["project_id"] for p in result} == {mine, led}
    assert theirs not in {p["project_id"] for p in result}
    assert client.post("/posts", json={"content": "Autorizado", "project_id": led}).status_code == 201
    assert client.post("/posts", json={"content": "Negado", "project_id": theirs}).status_code == 403
    guest = TestClient(app, headers=HEADERS)
    assert guest.get("/projects/search?writable_only=true").json()["items"] == []
