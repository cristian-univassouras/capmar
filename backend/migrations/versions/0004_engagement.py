"""Administração auditável, MFA, chat e autoria/apoio."""
from alembic import op
import sqlalchemy as sa

revision = "0004_engagement"
down_revision = "0003_vitrine"
branch_labels = depends_on = None


def upgrade():
    for column in (
        sa.Column("role", sa.String(16), nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("mfa_secret", sa.Text()), sa.Column("mfa_pending", sa.Text()),
        sa.Column("mfa_pending_until", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mfa_last_step", sa.BigInteger(), nullable=False, server_default="-1"),
    ): op.add_column("users", column)
    op.create_check_constraint("user_role", "users", "role IN ('user','admin')")
    op.create_check_constraint("admin_requires_mfa", "users", "role != 'admin' OR mfa_secret IS NOT NULL")
    op.add_column("auth_sessions", sa.Column("admin_verified_until", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("post", sa.Column("is_hidden", sa.Boolean(), nullable=False, server_default=sa.false()))
    for column in (
        sa.Column("authorship", sa.String(16), nullable=False, server_default="individual"),
        sa.Column("responsible_names", sa.String(500)), sa.Column("funding_url", sa.String(2048)),
        sa.Column("funding_description", sa.String(300)),
    ): op.add_column("project", column)
    op.create_check_constraint("project_authorship", "project", "authorship IN ('individual','group')")
    op.create_check_constraint("project_group_responsible", "project", "authorship != 'group' OR length(trim(responsible_names)) > 0 AND responsible_names IS NOT NULL")
    op.create_table("audit_logs", sa.Column("audit_id", sa.BigInteger(), primary_key=True),
        sa.Column("actor_id", sa.Integer()), sa.Column("action", sa.String(64), nullable=False),
        sa.Column("target_type", sa.String(32), nullable=False), sa.Column("target_id", sa.Integer()),
        sa.Column("reason", sa.String(500), nullable=False), sa.Column("details", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    # O próprio banco recusa UPDATE/DELETE, mesmo se DML amplo for concedido por engano.
    op.execute("""CREATE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Audit records are append-only'; END $$""")
    op.execute("CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation()")
    op.create_table("conversations", sa.Column("conversation_id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_table("conversation_participants",
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("conversations.conversation_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True))
    op.create_index("ix_conversation_participants_user_id", "conversation_participants", ["user_id"])
    op.create_table("chat_messages", sa.Column("message_id", sa.BigInteger(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("conversations.conversation_id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", sa.String(36), nullable=False), sa.Column("content", sa.String(2000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("conversation_id", "sender_id", "client_id", name="chat_idempotency"),
        sa.CheckConstraint("length(trim(content)) BETWEEN 1 AND 2000", name="chat_content"))
    op.create_index("ix_chat_messages_conversation_id", "chat_messages", ["conversation_id"])
    op.create_index("ix_chat_messages_cursor", "chat_messages", ["conversation_id", "message_id"])
    op.create_table("chat_leases", sa.Column("lease_id", sa.String(32), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.Integer(), nullable=False))
    op.create_index("ix_chat_leases_user_id", "chat_leases", ["user_id"])
    op.create_index("ix_chat_leases_expires_at", "chat_leases", ["expires_at"])


def downgrade():
    raise RuntimeError("Preserve mensagens e auditoria: restaure um backup verificado para retornar à Fase C")
