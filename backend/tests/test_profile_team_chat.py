import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from sqlalchemy import select, text
from starlette.websockets import WebSocketDisconnect

from app import database, models
from test_engagement import client_for


def message(content="Olá da equipe"):
    return {"content": content, "client_id": str(uuid.uuid4())}


def test_direct_pair_reused_in_both_directions_and_concurrently(client):
    alice, a = client_for("alice")
    bob, b = client_for("bob")
    assert client.post("/chat/direct", json={"recipient_id": a["user_id"]}).status_code == 401
    with ThreadPoolExecutor(2) as pool:
        jobs = [pool.submit(c.post, "/chat/direct", json={"recipient_id": uid})
                for c, uid in [(alice, b["user_id"]), (bob, a["user_id"])]]
        results = [job.result() for job in jobs]
    assert [r.status_code for r in results] == [201, 201]
    cid = results[0].json()["conversation_id"]
    assert results[1].json()["conversation_id"] == cid
    assert results[0].json()["title"] == "@bob"
    assert results[1].json()["title"] == "@alice"
    assert len(results[0].json()["participants"]) == 2
    for _ in range(12):  # Reabrir uma conversa não consome a cota de criação.
        assert alice.post("/chat/direct", json={"recipient_id": b["user_id"]}).json()["conversation_id"] == cid
    assert alice.post("/chat/direct", json={"recipient_id": a["user_id"]}).status_code == 422
    assert alice.post("/chat/direct", json={"recipient_id": 99999}).status_code == 404
    assert alice.post("/chat/direct", json={"recipient_id": b["user_id"], "participant_ids": [a["user_id"]]}).status_code == 422
    assert alice.post("/chat/conversations", json={"title": "Grupo livre", "participant_ids": [b["user_id"]]}).status_code == 405
    with database.SessionLocal.begin() as db:
        db.get(models.User, b["user_id"]).is_active = False
    assert alice.post("/chat/direct", json={"recipient_id": b["user_id"]}).status_code == 404


@pytest.mark.parametrize("private", [False, True])
def test_team_chat_membership_history_revocation_and_delete(private):
    leader, a = client_for("leader")
    bob, b = client_for("bob")
    outsider, _ = client_for("outsider")
    project = leader.post("/projects", json={"name": "Projeto", "visibility": not private}).json()
    tid = leader.post("/teams", json={"team_name": "Equipe", "project_id": project["project_id"]}).json()["team_id"]
    conversation = leader.get(f"/chat/teams/{tid}").json()
    cid = conversation["conversation_id"]
    assert conversation["kind"] == "team"
    assert [u["user_id"] for u in conversation["participants"]] == [a["user_id"]]
    assert bob.get(f"/chat/teams/{tid}").status_code == 404
    assert outsider.get(f"/chat/conversations/{cid}").status_code == 404
    assert outsider.get("/chat/conversations").json() == []
    assert outsider.post(f"/chat/conversations/{cid}/messages", json=message()).status_code == 404
    assert leader.post(f"/teams/{tid}/members", json={"user_id": b["user_id"]}).status_code == 200
    assert bob.get(f"/chat/teams/{tid}").json()["conversation_id"] == cid
    assert len(bob.get(f"/chat/conversations/{cid}").json()["participants"]) == 2
    assert leader.patch(f"/teams/{tid}", json={"team_name": "E" * 255}).status_code == 200
    assert bob.get(f"/chat/conversations/{cid}").json()["title"] == "E" * 255
    with bob.websocket_connect(f"/chat/ws/{cid}", headers={"Origin": "http://localhost:3000"}) as ws:
        ws.receive_json()
        assert leader.post(f"/chat/conversations/{cid}/messages", json=message()).status_code == 201
        while not ws.receive_json()["items"]:
            pass
        assert leader.delete(f'/teams/{tid}/members/{b["user_id"]}').status_code == 200
        with pytest.raises(WebSocketDisconnect):
            while True: ws.receive_json()
    assert bob.get(f"/chat/conversations/{cid}/messages").status_code == 404
    assert bob.post(f"/chat/conversations/{cid}/messages", json=message()).status_code == 404
    assert bob.get("/chat/conversations").json() == []
    assert leader.post(f"/teams/{tid}/members", json={"user_id": b["user_id"]}).status_code == 200
    assert len(bob.get(f"/chat/conversations/{cid}/messages").json()) == 1
    assert leader.delete(f'/projects/{project["project_id"]}').status_code == 204
    assert bob.get(f"/chat/conversations/{cid}").status_code == 404
    with database.SessionLocal() as db:
        assert db.get(models.Conversation, cid) is None
        assert list(db.scalars(select(models.ChatMessage))) == []


def test_team_chat_sync_is_atomic_for_concurrent_additions_and_rollback():
    leader, a = client_for("leader")
    _, b = client_for("bob")
    _, c = client_for("carol")
    pid = leader.post("/projects", json={"name": "Projeto"}).json()["project_id"]
    tid = leader.post("/teams", json={"team_name": "Equipe", "project_id": pid}).json()["team_id"]
    with ThreadPoolExecutor(2) as pool:
        jobs = [pool.submit(leader.post, f"/teams/{tid}/members", json={"user_id": u["user_id"]}) for u in [b, c]]
        assert [job.result().status_code for job in jobs] == [200, 200]
    room = leader.get(f"/chat/teams/{tid}").json()
    assert {u["user_id"] for u in room["participants"]} == {a["user_id"], b["user_id"], c["user_id"]}
    with database.SessionLocal() as db:
        db.execute(text("DELETE FROM team_users WHERE team_id=:tid AND user_id=:uid"), {"tid": tid, "uid": b["user_id"]})
        db.rollback()
    assert len(leader.get(f"/chat/teams/{tid}").json()["participants"]) == 3
    assert leader.delete(f"/teams/{tid}").status_code == 204
    assert leader.get(f'/chat/conversations/{room["conversation_id"]}').status_code == 404


def test_legacy_chat_preserves_history_but_disallows_new_messages():
    alice, a = client_for("alice")
    with database.SessionLocal.begin() as db:
        room = models.Conversation(title="Antiga", participants=[db.get(models.User, a["user_id"])])
        db.add(room); db.flush()
        cid = room.conversation_id
        db.add(models.ChatMessage(conversation_id=cid, sender_id=a["user_id"], **message("Histórico")))
    assert alice.get(f"/chat/conversations/{cid}").json()["kind"] == "legacy"
    assert alice.get(f"/chat/conversations/{cid}/messages").json()[0]["content"] == "Histórico"
    assert alice.post(f"/chat/conversations/{cid}/messages", json=message()).status_code == 403


def test_message_waiting_for_team_change_rechecks_membership(monkeypatch):
    from threading import Event
    from app.routers import chat
    leader, _ = client_for("leader")
    bob, b = client_for("bob")
    pid = leader.post("/projects", json={"name": "Concorrência"}).json()["project_id"]
    tid = leader.post("/teams", json={"team_name": "Equipe", "project_id": pid}).json()["team_id"]
    leader.post(f"/teams/{tid}/members", json={"user_id": b["user_id"]})
    cid = bob.get(f"/chat/teams/{tid}").json()["conversation_id"]
    checked = Event()
    original = chat.require_participant

    def observed(*args):
        result = original(*args)
        checked.set()
        return result

    monkeypatch.setattr(chat, "require_participant", observed)
    with ThreadPoolExecutor(1) as pool:
        with database.SessionLocal.begin() as db:
            db.execute(select(models.Team.team_id).where(models.Team.team_id == tid).with_for_update())
            future = pool.submit(bob.post, f"/chat/conversations/{cid}/messages", json=message())
            assert checked.wait(5)
            db.execute(text("DELETE FROM team_users WHERE team_id=:tid AND user_id=:uid"), {"tid": tid, "uid": b["user_id"]})
        assert future.result(timeout=5).status_code == 404
    assert leader.get(f"/chat/conversations/{cid}/messages").json() == []
