"""Apresentação de projetos e recuperação de senha por e-mail."""
from alembic import op
import sqlalchemy as sa

revision = "0006_portfolio_recovery"
down_revision = "0005_profile_team_chat"
branch_labels = depends_on = None


def upgrade():
    op.add_column("project", sa.Column("accent", sa.String(16), nullable=False, server_default="roxo"))
    op.add_column("project", sa.Column("portfolio", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("project", sa.Column("partners", sa.JSON(), nullable=False, server_default="[]"))
    op.execute("UPDATE project SET template = 'classico' WHERE template IS NOT NULL AND template NOT IN ('classico','criativo','minimalista')")
    op.create_check_constraint("project_template", "project", "template IS NULL OR template IN ('classico','criativo','minimalista')")
    op.create_check_constraint("project_accent", "project", "accent IN ('roxo','laranja','azul')")
    op.create_table("password_resets",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(50), nullable=False),
        sa.Column("expires_at", sa.Integer(), nullable=False))
    op.create_index("ix_password_resets_user_id", "password_resets", ["user_id"])
    op.create_index("ix_password_resets_expires_at", "password_resets", ["expires_at"])


def downgrade():
    raise RuntimeError("Recupere o backup verificado para reverter esta migração")
