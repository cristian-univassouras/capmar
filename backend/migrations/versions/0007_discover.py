"""Baralho de projetos do evento: sessões anônimas, eventos e votos."""
from alembic import op
import sqlalchemy as sa

revision = "0007_discover"
down_revision = "0006_portfolio_recovery"
branch_labels = depends_on = None


def upgrade():
    op.create_table("discover_sessions",
        sa.Column("session_id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("source", sa.String(40)),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="SET NULL")),
        sa.Column("user_agent", sa.String(300)),
        sa.Column("device_type", sa.String(10)),
        sa.Column("os", sa.String(20)),
        sa.Column("browser", sa.String(20)),
        sa.Column("language", sa.String(16)),
        sa.Column("viewport_w", sa.Integer()),
        sa.Column("viewport_h", sa.Integer()),
        sa.Column("touch", sa.Boolean()),
        sa.Column("referrer", sa.String(200)),
        sa.Column("ip_hash", sa.String(64)),
        sa.Column("visits", sa.Integer(), nullable=False, server_default="0"))
    op.create_index("ix_discover_sessions_created_at", "discover_sessions", ["created_at"])
    op.create_index("ix_discover_sessions_source", "discover_sessions", ["source"])
    op.create_table("discover_events",
        sa.Column("event_id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("session_id", sa.String(36), sa.ForeignKey("discover_sessions.session_id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_event_id", sa.String(36), nullable=False),
        sa.Column("event_type", sa.String(24), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("project.project_id", ondelete="SET NULL")),
        sa.Column("method", sa.String(12)),
        sa.Column("position", sa.Integer()),
        sa.Column("dwell_ms", sa.Integer()),
        sa.Column("value", sa.Integer()),
        sa.Column("meta", sa.JSON()),
        sa.Column("client_ts", sa.BigInteger()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("session_id", "client_event_id", name="discover_event_client"))
    op.create_index("ix_discover_events_session_id", "discover_events", ["session_id"])
    op.create_index("ix_discover_events_event_type", "discover_events", ["event_type"])
    op.create_index("ix_discover_events_project_id", "discover_events", ["project_id"])
    op.create_index("ix_discover_events_created_at", "discover_events", ["created_at"])
    op.create_table("discover_votes",
        sa.Column("session_id", sa.String(36), sa.ForeignKey("discover_sessions.session_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("project.project_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("vote", sa.String(7), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("changes", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint("vote IN ('like','dislike')", name="discover_vote_value"))
    op.create_index("ix_discover_votes_project_id", "discover_votes", ["project_id"])


def downgrade():
    raise RuntimeError("Recupere o backup verificado para reverter esta migração")
