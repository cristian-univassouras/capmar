"""Sessões, limites, mídia privada e invariantes de dados."""
from alembic import op
import sqlalchemy as sa

revision = "0002_security"
down_revision = "0001_baseline"
branch_labels = depends_on = None

CHECKS = {
    "users": {
        "username_length": "length(trim(username)) BETWEEN 3 AND 20",
        "email_length": "length(email) BETWEEN 3 AND 50",
        "first_name_length": "first_name IS NULL OR length(first_name) <= 20",
        "last_name_length": "last_name IS NULL OR length(last_name) <= 100",
    },
    "project": {
        "project_name": "length(trim(name)) BETWEEN 1 AND 100",
        "project_description": "description IS NULL OR length(description) <= 10000",
        "project_status": "status IN ('rascunho', 'ativo', 'pausado', 'concluido')",
    },
    "team": {
        "team_name_length": "length(trim(team_name)) BETWEEN 1 AND 255",
        "team_purpose": "purpose IS NULL OR length(purpose) <= 5000",
    },
    "post": {"post_content": "length(trim(content)) BETWEEN 1 AND 5000"},
    "project_comments": {"comment_content": "length(trim(content)) BETWEEN 1 AND 5000"},
    "category": {"category_description": "length(trim(description)) BETWEEN 1 AND 100"},
}


def upgrade():
    bind = op.get_bind()
    if bind.scalar(sa.text("SELECT count(*) FROM (SELECT team_id FROM team_users GROUP BY team_id HAVING count(*) > 100) oversized")):
        raise RuntimeError("Equipes legadas excedem 100 integrantes; revise antes de migrar")
    for table, checks in CHECKS.items():
        for name, condition in checks.items():
            if bind.scalar(sa.text(f"SELECT count(*) FROM {table} WHERE NOT ({condition})")):
                raise RuntimeError(f"Dados legados incompatíveis com {name}; corrija antes de migrar")
    if bind.scalar(sa.text("SELECT count(*) FROM (SELECT lower(email) FROM users GROUP BY lower(email) HAVING count(*) > 1) duplicates")):
        raise RuntimeError("E-mails legados duplicados sem distinção de caixa; resolva antes de migrar")
    bind.execute(sa.text("UPDATE users SET email = lower(email)"))
    for table, checks in CHECKS.items():
        with op.batch_alter_table(table) as batch:
            for name, condition in checks.items():
                batch.create_check_constraint(name, condition)
    for table, column in (("project", "owner_id"), ("team", "leader_id")):
        keys = sa.inspect(bind).get_foreign_keys(table)
        if not any(key["constrained_columns"] == [column] for key in keys):
            with op.batch_alter_table(table) as batch:
                batch.create_foreign_key(f"fk_{table}_{column}", "users", [column], ["user_id"], ondelete="SET NULL")
    keys = sa.inspect(bind).get_foreign_keys("post")
    if bind.dialect.name == "postgresql":
        for key in keys:
            if key["constrained_columns"] == ["project_id"]:
                op.drop_constraint(key["name"], "post", type_="foreignkey")
        op.create_foreign_key("fk_post_project_id", "post", "project", ["project_id"], ["project_id"], ondelete="CASCADE")
    op.create_table("auth_sessions",
        sa.Column("session_id", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.Integer(), nullable=False))
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"])
    op.create_table("rate_buckets",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("window", sa.Integer(), primary_key=True),
        sa.Column("count", sa.Integer(), nullable=False))
    op.create_table("media_uploads",
        sa.Column("upload_id", sa.String(32), primary_key=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("content_type", sa.String(32), nullable=False),
        sa.Column("created_at", sa.Integer(), nullable=False),
        sa.Column("resource_type", sa.String(16)),
        sa.Column("resource_id", sa.Integer()))
    op.create_index("ix_media_uploads_owner_id", "media_uploads", ["owner_id"])
    op.create_index("ix_media_uploads_created_at", "media_uploads", ["created_at"])


def downgrade():
    raise RuntimeError("Migração de segurança exige restauração de backup, sem downgrade destrutivo")
