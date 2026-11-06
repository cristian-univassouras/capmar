import uuid

from sqlalchemy import text

from app import database, discover_metrics
from conftest import account

UA = {"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"}


def make_project(client, name="Horta", **extra):
    response = client.post("/projects", json={"name": name, "description": "Descrição " + name, "status": "ativo", "visibility": True, **extra})
    assert response.status_code == 201, response.text
    return response.json()["project_id"]


def ev(type_, **kw):
    return {"id": str(uuid.uuid4()), "type": type_, **kw}


def send(client, session, events, **device):
    return client.post("/discover/events", json={"session_id": session, "device": device or None, "events": events}, headers=UA)


def test_deck_lists_only_public_non_draft_projects_and_needs_no_login(client):
    account(client, "owner")
    public = make_project(client, "Publico")
    make_project(client, "Privado", visibility=False)
    make_project(client, "Rascunho", status="rascunho")
    with client.__class__(client.app, headers=client.headers) as guest:
        session = str(uuid.uuid4())
        deck = guest.get("/discover/deck", params={"session_id": session})
        assert deck.status_code == 200
        assert [c["project_id"] for c in deck.json()["cards"]] == [public]
        assert guest.get("/discover/deck", params={"session_id": "invalido"}).status_code == 422


def test_everything_is_recorded_and_votes_follow_changes_and_retries(client):
    account(client, "owner")
    a, b = make_project(client, "A"), make_project(client, "B")
    session = str(uuid.uuid4())
    first = [ev("session_start"), ev("deck_loaded", value=2), ev("card_view", project_id=a, position=0),
             ev("like", project_id=a, method="swipe", dwell_ms=4200, position=0),
             ev("card_view", project_id=b, position=1), ev("details_open", project_id=b, method="tap"),
             ev("dislike", project_id=b, method="button", dwell_ms=9000, position=1)]
    result = send(client, session, first, language="pt-BR", viewport_w=390, viewport_h=844, touch=True, source="feira-2026").json()
    assert result == {"accepted": 7, "duplicates": 0, "rejected": 0}
    # Reenvio do mesmo lote (rede instável): nada duplica.
    assert send(client, session, first).json() == {"accepted": 0, "duplicates": 7, "rejected": 0}
    # Mudar de ideia conta como mudança; desfazer remove o voto atual mas mantém o histórico.
    send(client, session, [ev("like", project_id=b, method="swipe"), ev("undo", project_id=a), ev("deck_end"), ev("ranking_view")])
    with database.SessionLocal() as db:
        votes = {r.project_id: (r.vote, r.changes) for r in db.execute(text("SELECT * FROM discover_votes")).all()}
        assert votes == {b: ("like", 1)}
        assert db.scalar(text("SELECT count(*) FROM discover_events")) == 11
        row = db.execute(text("SELECT device_type, os, browser, source, visits, touch FROM discover_sessions")).one()
        assert tuple(row) == ("mobile", "iOS", "Safari", "feira-2026", 1, True)
        assert db.execute(text("SELECT ip_hash FROM discover_sessions")).scalar() not in (None, "testclient", "127.0.0.1")


def test_invalid_events_are_rejected_and_unknown_projects_do_not_vote(client):
    session = str(uuid.uuid4())
    assert client.post("/discover/events", json={"session_id": session, "events": [{"id": "x", "type": "like"}]}).status_code == 422
    assert client.post("/discover/events", json={"session_id": session, "events": [ev("hackeado")]}).status_code == 422
    assert client.post("/discover/events", json={"session_id": session, "events": [ev("like", project_id=999)]}).json()["rejected"] == 1
    with database.SessionLocal() as db:
        assert db.scalar(text("SELECT count(*) FROM discover_votes")) == 0
        assert db.scalar(text("SELECT count(*) FROM discover_events WHERE project_id IS NULL")) == 1


def test_metrics_and_ranking_count_people_and_votes(client):
    account(client, "owner")
    a, b = make_project(client, "A"), make_project(client, "B")
    for index in range(3):
        session = str(uuid.uuid4())
        events = [ev("session_start"), ev("card_view", project_id=a, position=0),
                  ev("like", project_id=a, method="swipe", dwell_ms=2000, position=0),
                  ev("card_view", project_id=b, position=1),
                  ev("like" if index == 0 else "dislike", project_id=b, method="button", dwell_ms=6000, position=1)]
        if index == 0:
            events += [ev("details_open", project_id=b), ev("deck_end")]
        send(client, session, events, source="feira")
    ranking = client.get("/discover/ranking").json()
    assert ranking["people"] == 3
    assert [(i["name"], i["likes"], i["dislikes"]) for i in ranking["items"]] == [("A", 3, 0), ("B", 1, 2)]
    with database.SessionLocal() as db:
        data = discover_metrics.compute(db, None, None, None)
        assert data["totals"]["people"] == 3 and data["totals"]["votes_cast"] == 6
        assert data["totals"]["likes"] == 4 and data["totals"]["dislikes"] == 2 and data["totals"]["like_rate"] == 0.667
        assert data["people"]["likers"] == 3 and data["people"]["dislikers"] == 2 and data["people"]["finished"] == 1
        assert data["engagement"]["avg_votes_per_person"] == 2.0
        assert data["funnel"][0] == {"step": "Chegaram", "people": 3}
        by_name = {p["name"]: p for p in data["projects"]}
        assert by_name["A"]["rank"] == 1 and by_name["A"]["approval"] == 1.0 and by_name["B"]["details_liked"] == 1
        assert discover_metrics.compute(db, None, None, "outra")["totals"]["people"] == 0
        for kind in ("events", "votes", "sessions", "projects"):
            assert discover_metrics.export_csv(db, kind, None, None, None).startswith("﻿")


def test_csv_export_neutralizes_formulas(client):
    account(client, "owner")
    make_project(client, "=HYPERLINK(\"x\")")
    session = str(uuid.uuid4())
    send(client, session, [ev("session_start")])
    with database.SessionLocal() as db:
        assert "'=HYPERLINK" in discover_metrics.export_csv(db, "projects", None, None, None)


def test_event_network_shared_ip_is_not_blocked_by_global_write_limit(client):
    session = str(uuid.uuid4())
    for _ in range(130):  # acima do limite global de escrita por IP (120/min)
        assert send(client, session, [ev("card_view")]).status_code == 200


def test_admin_endpoints_require_admin(client):
    assert client.get("/admin/discover/metrics").status_code == 401
    assert client.get("/admin/discover/export", params={"kind": "events"}).status_code == 401
    account(client, "comum")
    assert client.get("/admin/discover/metrics").status_code == 403
