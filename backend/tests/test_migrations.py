import uuid

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url

from app import database


@pytest.mark.parametrize("legacy", [False, True])
def test_new_and_existing_database_upgrade(monkeypatch, legacy):
    schema = "migration_test_" + uuid.uuid4().hex
    with database.engine.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA "{schema}"'))
    url = make_url(str(database.engine.url.render_as_string(hide_password=False))).update_query_dict(
        {"options": "-csearch_path=" + schema})
    isolated = create_engine(url)
    try:
        if legacy:
            from migrations.legacy_schema import Base
            Base.metadata.create_all(isolated)
            with isolated.begin() as conn:
                conn.execute(text("INSERT INTO users (username,email,user_password) VALUES ('legacy','Legacy@example.com','hash')"))
                conn.execute(text("INSERT INTO project (name,status,visibility,owner_id) VALUES ('Preservado','ativo',false,1)"))
                conn.execute(text("ALTER TABLE project DROP COLUMN owner_id"))
                conn.execute(text("ALTER TABLE team DROP COLUMN leader_id"))
                conn.execute(text("INSERT INTO keywords(word,popularity) VALUES (' Maricá ',1),('MARICÁ',1)"))
                conn.execute(text("INSERT INTO projects_keywords(project_id,keyword_id) VALUES (1,1),(1,2)"))
        monkeypatch.setenv("MIGRATION_DATABASE_URL", url.render_as_string(hide_password=False))
        command.upgrade(Config("alembic.ini"), "head")
        command.upgrade(Config("alembic.ini"), "head")  # repetível
        with isolated.connect() as conn:
            assert conn.scalar(text("SELECT version_num FROM alembic_version")) == "0007_discover"
            assert conn.scalar(text("SELECT count(*) FROM category")) == 8
            assert {"auth_sessions", "media_uploads", "rate_buckets"}.issubset(inspect(conn).get_table_names())
            if legacy:
                assert conn.scalar(text("SELECT name FROM project")) == "Preservado"
                assert conn.scalar(text("SELECT email FROM users")) == "legacy@example.com"
                assert inspect(conn).get_foreign_keys("project")
                assert conn.execute(text("SELECT word FROM keywords")).scalars().all() == ["maricá"]
                assert conn.scalar(text("SELECT count(*) FROM projects_keywords")) == 1
    finally:
        isolated.dispose()
        with database.engine.begin() as conn:
            conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))

def test_existing_chats_and_teams_are_migrated_without_history_loss(monkeypatch):
    schema = "chat_migration_" + uuid.uuid4().hex
    with database.engine.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA "{schema}"'))
    url = database.engine.url.update_query_dict({"options": "-csearch_path=" + schema})
    isolated = create_engine(url)
    try:
        monkeypatch.setenv("MIGRATION_DATABASE_URL", url.render_as_string(hide_password=False))
        command.upgrade(Config("alembic.ini"), "0004_engagement")
        with isolated.begin() as conn:
            conn.execute(text("INSERT INTO users(username,email,user_password) VALUES ('alice','alice@example.com','hash'),('bob','bob@example.com','hash'),('carol','carol@example.com','hash')"))
            conn.execute(text("INSERT INTO project(name,owner_id,status,visibility) VALUES ('Projeto',1,'ativo',false)"))
            conn.execute(text("INSERT INTO team(team_name,project_id,leader_id) VALUES ('Equipe existente',1,1)"))
            conn.execute(text("INSERT INTO team_users(team_id,user_id) VALUES (1,2),(1,3)"))
            conn.execute(text("INSERT INTO conversations(title) VALUES ('Direta original'),('Duplicada'),('Grupo antigo')"))
            conn.execute(text("INSERT INTO conversation_participants VALUES (1,1),(1,2),(2,1),(2,2),(3,1),(3,2),(3,3)"))
            conn.execute(text("INSERT INTO chat_messages(conversation_id,sender_id,client_id,content) VALUES (1,1,'primeira','Mensagem direta'),(2,2,'segunda','Histórico duplicado'),(3,3,'terceira','Histórico coletivo')"))
        command.upgrade(Config("alembic.ini"), "head")
        command.upgrade(Config("alembic.ini"), "head")
        with isolated.connect() as conn:
            assert conn.scalar(text("SELECT count(*) FROM chat_messages")) == 3
            assert conn.execute(text("SELECT kind FROM conversations ORDER BY conversation_id")).scalars().all() == ["direct", "legacy", "legacy", "team"]
            assert conn.execute(text("SELECT direct_low,direct_high FROM conversations WHERE conversation_id=1")).one() == (1, 2)
            assert conn.execute(text("SELECT user_id FROM conversation_participants WHERE conversation_id=4 ORDER BY user_id")).scalars().all() == [1, 2, 3]
            assert conn.scalar(text("SELECT title FROM conversations WHERE team_id=1")) == "Equipe existente"
    finally:
        isolated.dispose()
        with database.engine.begin() as conn:
            conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))


def test_database_roles_allow_dml_and_deny_ddl():
    from pathlib import Path
    from sqlalchemy.exc import ProgrammingError
    suffix = uuid.uuid4().hex[:12]
    app_role = "app_test_" + suffix
    migration_role = "migrator_test_" + suffix
    sql = Path("scripts/database-roles.sql").read_text(encoding="utf-8")
    sql = sql.replace("capmar_app", app_role).replace("capmar_migrator", migration_role)
    try:
        with database.engine.begin() as conn:
            conn.exec_driver_sql(sql)
            conn.execute(text(f"REVOKE INSERT, UPDATE, DELETE ON alembic_version FROM {app_role}"))
        with database.engine.begin() as conn:
            conn.execute(text(f"SET LOCAL ROLE {app_role}"))
            assert conn.scalar(text("SELECT version_num FROM alembic_version")) == "0007_discover"
            conn.execute(text("INSERT INTO users (username,email,user_password) VALUES ('limited','limited@example.com','hash')"))
            with pytest.raises(ProgrammingError):
                with conn.begin_nested():
                    conn.execute(text("CREATE TABLE forbidden_table (id int)"))
            with pytest.raises(ProgrammingError):
                with conn.begin_nested():
                    conn.execute(text("UPDATE alembic_version SET version_num='broken'"))
    finally:
        with database.engine.begin() as conn:
            conn.execute(text(f"DROP OWNED BY {app_role}, {migration_role}"))
            conn.execute(text(f"DROP ROLE {app_role}"))
            conn.execute(text(f"DROP ROLE {migration_role}"))
