"""Métricas e exportação do baralho do evento (somente leitura, para o painel do admin)."""
import csv
import io
import json
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

# Todos os cálculos partem das mesmas linhas: eventos no período, de sessões da origem escolhida.
SCOPE = """
WITH ev AS (
  SELECT e.event_id, e.session_id, e.event_type, e.project_id, e.method, e.position, e.dwell_ms, e.value, e.meta,
         e.client_ts, e.created_at, s.device_type, s.source
  FROM discover_events e JOIN discover_sessions s ON s.session_id = e.session_id
  WHERE (CAST(:src AS text) IS NULL OR s.source = :src)
    AND (CAST(:since AS timestamptz) IS NULL OR e.created_at >= :since)
    AND (CAST(:until AS timestamptz) IS NULL OR e.created_at < :until)
)
"""
PUBLIC = "p.visibility IS TRUE AND p.status <> 'rascunho'"


def _num(value, digits=1):
    return None if value is None else round(float(value), digits)


def _rows(db: Session, sql: str, params: dict):
    return [dict(r) for r in db.execute(text(SCOPE + sql), params).mappings()]


def _one(db: Session, sql: str, params: dict):
    rows = _rows(db, sql, params)
    return rows[0] if rows else {}


def compute(db: Session, since: datetime | None, until: datetime | None, source: str | None) -> dict:
    p = {"since": since, "until": until, "src": source}

    totals = _one(db, """
      SELECT count(DISTINCT session_id) AS people, count(*) AS events,
        count(*) FILTER (WHERE event_type='session_start') AS visits,
        count(*) FILTER (WHERE event_type='card_view') AS card_views,
        count(*) FILTER (WHERE event_type='like') AS likes,
        count(*) FILTER (WHERE event_type='dislike') AS dislikes,
        count(*) FILTER (WHERE event_type='undo') AS undos,
        count(*) FILTER (WHERE event_type='drag_cancel') AS drag_cancels,
        count(*) FILTER (WHERE event_type='details_open') AS details_opens,
        count(*) FILTER (WHERE event_type='project_link_click') AS link_clicks,
        count(*) FILTER (WHERE event_type='signup_click') AS signup_clicks,
        count(*) FILTER (WHERE event_type='error') AS errors,
        count(DISTINCT session_id) FILTER (WHERE event_type IN ('like','dislike')) AS voters,
        count(DISTINCT session_id) FILTER (WHERE event_type='like') AS likers,
        count(DISTINCT session_id) FILTER (WHERE event_type='dislike') AS dislikers,
        count(DISTINCT session_id) FILTER (WHERE event_type='details_open') AS details_people,
        count(DISTINCT session_id) FILTER (WHERE event_type='project_link_click') AS link_people,
        count(DISTINCT session_id) FILTER (WHERE event_type='signup_click') AS signup_people,
        count(DISTINCT session_id) FILTER (WHERE event_type='undo') AS undo_people,
        count(DISTINCT session_id) FILTER (WHERE event_type='ranking_view') AS ranking_people,
        min(created_at) AS first_event, max(created_at) AS last_event
      FROM ev""", p)

    people = _one(db, """
      , ps AS (SELECT session_id, min(created_at) AS first_ts, max(created_at) AS last_ts,
          count(*) FILTER (WHERE event_type IN ('like','dislike')) AS votes,
          bool_or(event_type='deck_loaded') AS loaded, bool_or(event_type='card_view') AS viewed,
          bool_or(event_type='deck_end') AS finished, bool_or(event_type='ranking_view') AS saw_ranking,
          bool_or(event_type='signup_click') AS signup,
          min(created_at) FILTER (WHERE event_type IN ('like','dislike')) AS first_vote_ts
        FROM ev GROUP BY session_id)
      SELECT count(*) AS people, avg(votes) AS avg_votes,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY votes) AS median_votes,
        avg(extract(epoch FROM last_ts - first_ts)) AS avg_seconds,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM last_ts - first_ts)) AS median_seconds,
        avg(extract(epoch FROM first_vote_ts - first_ts)) AS avg_seconds_to_first_vote,
        count(*) FILTER (WHERE votes = 0) AS v0, count(*) FILTER (WHERE votes BETWEEN 1 AND 4) AS v1_4,
        count(*) FILTER (WHERE votes BETWEEN 5 AND 9) AS v5_9, count(*) FILTER (WHERE votes BETWEEN 10 AND 19) AS v10_19,
        count(*) FILTER (WHERE votes >= 20) AS v20,
        count(*) FILTER (WHERE loaded) AS f_loaded, count(*) FILTER (WHERE viewed) AS f_viewed,
        count(*) FILTER (WHERE votes >= 1) AS f_vote1, count(*) FILTER (WHERE votes >= 5) AS f_vote5,
        count(*) FILTER (WHERE finished) AS f_finished, count(*) FILTER (WHERE saw_ranking) AS f_ranking,
        count(*) FILTER (WHERE signup) AS f_signup
      FROM ps""", p)

    current = _one(db, """
      SELECT count(*) AS votes, count(*) FILTER (WHERE vote='like') AS likes,
        coalesce(sum(changes),0) AS changes, count(*) FILTER (WHERE changes > 0) AS changed
      FROM discover_votes WHERE session_id IN (SELECT session_id FROM ev)""", p)

    dwell = _rows(db, """
      SELECT event_type, count(*) AS n, avg(dwell_ms) AS avg_ms,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY dwell_ms) AS median_ms
      FROM ev WHERE event_type IN ('like','dislike') AND dwell_ms IS NOT NULL GROUP BY event_type""", p)
    details_time = _one(db, """
      SELECT count(*) AS n, avg(dwell_ms) AS avg_ms FROM ev WHERE event_type='details_close' AND dwell_ms IS NOT NULL""", p)
    methods = _rows(db, """
      SELECT coalesce(method,'?') AS method, event_type, count(*) AS n FROM ev
      WHERE event_type IN ('like','dislike') GROUP BY 1, 2""", p)

    pairs = _rows(db, """
      , pr AS (SELECT session_id, project_id, bool_or(event_type='details_open') AS opened,
          bool_or(event_type='like') AS liked, bool_or(event_type IN ('like','dislike')) AS voted
        FROM ev WHERE project_id IS NOT NULL GROUP BY 1, 2)
      SELECT opened, count(*) AS pairs, count(*) FILTER (WHERE liked) AS liked FROM pr WHERE voted GROUP BY opened""", p)
    by_position = _rows(db, """
      SELECT (position / 5) * 5 AS start, count(*) AS votes, count(*) FILTER (WHERE event_type='like') AS likes
      FROM ev WHERE event_type IN ('like','dislike') AND position IS NOT NULL GROUP BY 1 ORDER BY 1 LIMIT 40""", p)

    devices = _rows(db, """
      SELECT coalesce(s.device_type,'?') AS device, coalesce(s.os,'?') AS os, coalesce(s.browser,'?') AS browser,
             (s.user_id IS NOT NULL) AS logged_in, (s.visits > 1) AS returned, count(*) AS n
      FROM discover_sessions s WHERE s.session_id IN (SELECT session_id FROM ev) GROUP BY 1, 2, 3, 4, 5""", p)
    sources = _rows(db, """
      SELECT coalesce(source,'(sem origem)') AS source, count(DISTINCT session_id) AS people,
        count(*) FILTER (WHERE event_type IN ('like','dislike')) AS votes,
        count(*) FILTER (WHERE event_type='like') AS likes FROM ev GROUP BY 1 ORDER BY people DESC""", p)
    timeline = _rows(db, """
      SELECT date_bin('10 minutes', created_at, TIMESTAMPTZ '2000-01-01') AS bucket,
        count(DISTINCT session_id) AS people, count(*) AS events,
        count(*) FILTER (WHERE event_type='like') AS likes, count(*) FILTER (WHERE event_type='dislike') AS dislikes
      FROM ev GROUP BY 1 ORDER BY 1""", p)
    errors = _rows(db, """
      SELECT coalesce(meta->>'message','(sem mensagem)') AS message, count(*) AS n FROM ev
      WHERE event_type='error' GROUP BY 1 ORDER BY n DESC LIMIT 5""", p)

    per_project = {r["project_id"]: r for r in _rows(db, f"""
      , pe AS (SELECT project_id,
          count(*) FILTER (WHERE event_type='card_view') AS views,
          count(DISTINCT session_id) FILTER (WHERE event_type='card_view') AS viewers,
          count(*) FILTER (WHERE event_type='like') AS like_events,
          count(*) FILTER (WHERE event_type='dislike') AS dislike_events,
          count(*) FILTER (WHERE event_type='undo') AS undos,
          count(*) FILTER (WHERE event_type='details_open') AS details,
          count(*) FILTER (WHERE event_type='project_link_click') AS link_clicks,
          avg(dwell_ms) FILTER (WHERE event_type IN ('like','dislike')) AS avg_dwell_ms
        FROM ev WHERE project_id IS NOT NULL GROUP BY project_id),
      pv AS (SELECT project_id, count(*) FILTER (WHERE vote='like') AS likes, count(*) FILTER (WHERE vote='dislike') AS dislikes,
          coalesce(sum(changes),0) AS changes
        FROM discover_votes WHERE session_id IN (SELECT session_id FROM ev) GROUP BY project_id),
      po AS (SELECT project_id, count(DISTINCT session_id) FILTER (WHERE opened) AS opened_people,
          count(DISTINCT session_id) FILTER (WHERE opened AND liked) AS opened_liked
        FROM (SELECT session_id, project_id, bool_or(event_type='details_open') AS opened, bool_or(event_type='like') AS liked
              FROM ev WHERE project_id IS NOT NULL GROUP BY 1, 2) t GROUP BY project_id)
      SELECT p.project_id, p.name, c.description AS category,
        coalesce(pe.views,0) AS views, coalesce(pe.viewers,0) AS viewers,
        coalesce(pv.likes,0) AS likes, coalesce(pv.dislikes,0) AS dislikes, coalesce(pv.changes,0) AS changes,
        coalesce(pe.like_events,0) AS like_events, coalesce(pe.dislike_events,0) AS dislike_events,
        coalesce(pe.undos,0) AS undos, coalesce(pe.details,0) AS details, coalesce(po.opened_people,0) AS opened_people,
        coalesce(po.opened_liked,0) AS opened_liked, coalesce(pe.link_clicks,0) AS link_clicks, pe.avg_dwell_ms
      FROM project p LEFT JOIN category c ON c.id = p.category_id
        LEFT JOIN pe ON pe.project_id = p.project_id LEFT JOIN pv ON pv.project_id = p.project_id
        LEFT JOIN po ON po.project_id = p.project_id
      WHERE {PUBLIC} OR pe.project_id IS NOT NULL OR pv.project_id IS NOT NULL""", p)}

    projects = []
    for r in per_project.values():
        voted = r["likes"] + r["dislikes"]
        projects.append({
            "project_id": r["project_id"], "name": r["name"], "category": r["category"],
            "views": r["views"], "viewers": r["viewers"], "likes": r["likes"], "dislikes": r["dislikes"],
            "approval": round(r["likes"] / voted, 3) if voted else None,
            "like_events": r["like_events"], "dislike_events": r["dislike_events"], "vote_changes": r["changes"],
            "undos": r["undos"], "details": r["details"], "details_people": r["opened_people"],
            "details_liked": r["opened_liked"], "link_clicks": r["link_clicks"],
            "avg_dwell_s": _num(r["avg_dwell_ms"] / 1000) if r["avg_dwell_ms"] is not None else None})
    projects.sort(key=lambda x: (-x["likes"], -(x["approval"] or 0), x["name"].lower()))
    for i, row in enumerate(projects, 1):
        row["rank"] = i

    t, pp, cur = totals, people, current
    gross = (t.get("likes") or 0) + (t.get("dislikes") or 0)
    n = pp.get("people") or 0
    timeline_out = [{"bucket": r["bucket"].isoformat(), "people": r["people"], "events": r["events"],
                     "likes": r["likes"], "dislikes": r["dislikes"]} for r in timeline]
    peak = max(timeline, key=lambda r: r["people"], default=None)
    by_open = {bool(r["opened"]): r for r in pairs}

    def rate(r):
        return round(r["liked"] / r["pairs"], 3) if r and r["pairs"] else None

    return {
        "range": {"since": since.isoformat() if since else None, "until": until.isoformat() if until else None, "source": source,
                  "first_event": t["first_event"].isoformat() if t.get("first_event") else None,
                  "last_event": t["last_event"].isoformat() if t.get("last_event") else None},
        "totals": {
            "people": n, "visits": t.get("visits", 0), "events": t.get("events", 0), "card_views": t.get("card_views", 0),
            "votes_cast": gross, "likes": t.get("likes", 0), "dislikes": t.get("dislikes", 0),
            "like_rate": round(t["likes"] / gross, 3) if gross else None,
            "votes_current": cur.get("votes", 0), "likes_current": cur.get("likes", 0),
            "vote_changes": int(cur.get("changes", 0)), "people_who_changed": cur.get("changed", 0),
            "undos": t.get("undos", 0), "drag_cancels": t.get("drag_cancels", 0),
            "details_opens": t.get("details_opens", 0), "link_clicks": t.get("link_clicks", 0),
            "signup_clicks": t.get("signup_clicks", 0), "errors": t.get("errors", 0)},
        "people": {
            "voters": t.get("voters", 0), "likers": t.get("likers", 0), "dislikers": t.get("dislikers", 0),
            "details": t.get("details_people", 0), "link_clicks": t.get("link_people", 0),
            "signups": t.get("signup_people", 0), "undo": t.get("undo_people", 0), "ranking": t.get("ranking_people", 0),
            "finished": pp.get("f_finished", 0), "no_vote": pp.get("v0", 0),
            "returned": sum(r["n"] for r in devices if r["returned"]), "logged_in": sum(r["n"] for r in devices if r["logged_in"])},
        "engagement": {
            "avg_votes_per_person": _num(pp.get("avg_votes"), 2), "median_votes_per_person": _num(pp.get("median_votes"), 1),
            "avg_session_seconds": _num(pp.get("avg_seconds"), 0), "median_session_seconds": _num(pp.get("median_seconds"), 0),
            "avg_seconds_to_first_vote": _num(pp.get("avg_seconds_to_first_vote"), 1),
            "avg_decision_seconds": {r["event_type"]: _num(r["avg_ms"] / 1000, 2) for r in dwell if r["avg_ms"] is not None},
            "median_decision_seconds": {r["event_type"]: _num(r["median_ms"] / 1000, 2) for r in dwell if r["median_ms"] is not None},
            "avg_details_seconds": _num(details_time["avg_ms"] / 1000, 1) if details_time.get("avg_ms") is not None else None,
            "completion_rate": round(pp["f_finished"] / n, 3) if n else None,
            "bounce_rate": round(pp["v0"] / n, 3) if n else None,
            "details_rate": round(t["details_people"] / n, 3) if n else None,
            "like_rate_with_details": rate(by_open.get(True)), "like_rate_without_details": rate(by_open.get(False)),
            "votes_distribution": [
                {"label": "0 votos", "people": pp.get("v0", 0)}, {"label": "1 a 4", "people": pp.get("v1_4", 0)},
                {"label": "5 a 9", "people": pp.get("v5_9", 0)}, {"label": "10 a 19", "people": pp.get("v10_19", 0)},
                {"label": "20 ou mais", "people": pp.get("v20", 0)}]},
        "funnel": [
            {"step": "Chegaram", "people": n}, {"step": "Baralho carregou", "people": pp.get("f_loaded", 0)},
            {"step": "Viram um projeto", "people": pp.get("f_viewed", 0)}, {"step": "Votaram 1 vez", "people": pp.get("f_vote1", 0)},
            {"step": "Votaram 5 vezes", "people": pp.get("f_vote5", 0)}, {"step": "Chegaram ao fim", "people": pp.get("f_finished", 0)},
            {"step": "Viram o ranking", "people": pp.get("f_ranking", 0)}, {"step": "Clicaram em criar conta", "people": pp.get("f_signup", 0)}],
        "methods": [{"method": r["method"], "type": r["event_type"], "count": r["n"]} for r in methods],
        "by_position": [{"start": r["start"], "votes": r["votes"], "likes": r["likes"]} for r in by_position],
        "devices": devices,
        "sources": sources,
        "timeline": timeline_out,
        "peak": {"bucket": peak["bucket"].isoformat(), "people": peak["people"]} if peak else None,
        "errors": errors,
        "projects": projects,
    }


def _safe(value):
    """Evita injeção de fórmulas ao abrir o CSV no Excel/Sheets."""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    if isinstance(value, str) and value[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


def export_csv(db: Session, kind: str, since: datetime | None, until: datetime | None, source: str | None) -> str:
    p = {"since": since, "until": until, "src": source}
    if kind == "projects":
        data = compute(db, since, until, source)["projects"]
        rows = [{k: v for k, v in r.items()} for r in data]
    elif kind == "events":
        rows = _rows(db, """
          SELECT ev.event_id, ev.created_at, ev.session_id, ev.source, ev.device_type, ev.event_type, ev.project_id,
                 p.name AS project_name, ev.method, ev.position, ev.dwell_ms, ev.value, ev.meta, ev.client_ts
          FROM ev LEFT JOIN project p ON p.project_id = ev.project_id ORDER BY ev.event_id""", p)
    elif kind == "votes":
        rows = _rows(db, """
          SELECT v.session_id, v.project_id, p.name AS project_name, v.vote, v.created_at, v.updated_at, v.changes
          FROM discover_votes v JOIN project p ON p.project_id = v.project_id
          WHERE v.session_id IN (SELECT session_id FROM ev) ORDER BY v.created_at, v.session_id""", p)
    elif kind == "sessions":
        rows = _rows(db, """
          SELECT s.session_id, s.created_at, s.last_seen_at, s.source, s.device_type, s.os, s.browser, s.language,
                 s.viewport_w, s.viewport_h, s.touch, s.referrer, s.visits, (s.user_id IS NOT NULL) AS logged_in,
                 count(e.event_id) AS events,
                 count(e.event_id) FILTER (WHERE e.event_type='like') AS likes,
                 count(e.event_id) FILTER (WHERE e.event_type='dislike') AS dislikes,
                 count(e.event_id) FILTER (WHERE e.event_type='details_open') AS details_opens,
                 bool_or(e.event_type='deck_end') AS finished,
                 round(extract(epoch FROM max(e.created_at) - min(e.created_at))) AS active_seconds
          FROM discover_sessions s JOIN ev e ON e.session_id = s.session_id
          GROUP BY s.session_id ORDER BY s.created_at""", p)
    else:
        raise ValueError(kind)
    out = io.StringIO()
    out.write("﻿")
    if rows:
        writer = csv.DictWriter(out, fieldnames=list(rows[0].keys()), lineterminator="\r\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({k: _safe(v) for k, v in row.items()})
    return out.getvalue()
