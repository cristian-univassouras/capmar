"""Conversas diretas únicas e chats vinculados às equipes."""
from alembic import op
import sqlalchemy as sa

revision = "0005_profile_team_chat"
down_revision = "0004_engagement"
branch_labels = depends_on = None


def upgrade():
    op.alter_column("conversations", "title", type_=sa.String(255))
    op.add_column("conversations", sa.Column("kind", sa.String(16), nullable=False, server_default="legacy"))
    op.add_column("conversations", sa.Column("team_id", sa.Integer(), sa.ForeignKey("team.team_id", ondelete="CASCADE")))
    for field in ("direct_low", "direct_high"):
        op.add_column("conversations", sa.Column(field, sa.Integer(), sa.ForeignKey("users.user_id", ondelete="CASCADE")))
    op.create_unique_constraint("chat_team_unique", "conversations", ["team_id"])
    op.create_unique_constraint("chat_direct_unique", "conversations", ["direct_low", "direct_high"])
    op.create_check_constraint("chat_kind", "conversations", """
      (kind = 'legacy' AND team_id IS NULL AND direct_low IS NULL AND direct_high IS NULL) OR
      (kind = 'team' AND team_id IS NOT NULL AND direct_low IS NULL AND direct_high IS NULL) OR
      (kind = 'direct' AND team_id IS NULL AND direct_low IS NOT NULL AND direct_high IS NOT NULL AND direct_low < direct_high)
    """)
    # Reaproveita a conversa mais antiga de cada par; outros históricos são preservados.
    op.execute("""WITH pairs AS (
      SELECT conversation_id, min(user_id) lo, max(user_id) hi
      FROM conversation_participants GROUP BY conversation_id HAVING count(*) = 2
    ), ranked AS (
      SELECT *, row_number() OVER (PARTITION BY lo,hi ORDER BY conversation_id) n FROM pairs
    ) UPDATE conversations c SET kind='direct', direct_low=r.lo, direct_high=r.hi
      FROM ranked r WHERE r.n=1 AND c.conversation_id=r.conversation_id""")
    # Mesma transação da equipe: inclusive importações e exclusões em cascata.
    op.execute("""CREATE FUNCTION sync_team_chat(tid integer) RETURNS void LANGUAGE plpgsql AS $$
    DECLARE t team%ROWTYPE; cid integer;
    BEGIN
      SELECT * INTO t FROM team WHERE team_id=tid FOR UPDATE;
      IF NOT FOUND THEN RETURN; END IF;
      INSERT INTO conversations(title,kind,team_id) VALUES(t.team_name,'team',tid)
        ON CONFLICT(team_id) DO UPDATE SET title=EXCLUDED.title
        RETURNING conversation_id INTO cid;
      DELETE FROM conversation_participants cp WHERE cp.conversation_id=cid
        AND NOT EXISTS (SELECT 1 FROM team_users tu WHERE tu.team_id=tid AND tu.user_id=cp.user_id)
        AND cp.user_id IS DISTINCT FROM t.leader_id;
      INSERT INTO conversation_participants(conversation_id,user_id)
        SELECT cid, user_id FROM team_users WHERE team_id=tid
        UNION SELECT cid, t.leader_id WHERE t.leader_id IS NOT NULL
        ON CONFLICT DO NOTHING;
    END $$""")
    op.execute("""CREATE FUNCTION team_chat_changed() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN PERFORM sync_team_chat(OLD.team_id);
      ELSE PERFORM sync_team_chat(NEW.team_id);
        IF TG_OP = 'UPDATE' AND OLD.team_id <> NEW.team_id THEN PERFORM sync_team_chat(OLD.team_id); END IF;
      END IF;
      RETURN NULL;
    END $$""")
    op.execute("CREATE TRIGGER team_chat_sync AFTER INSERT OR UPDATE ON team FOR EACH ROW EXECUTE FUNCTION team_chat_changed()")
    op.execute("CREATE TRIGGER team_members_chat_sync AFTER INSERT OR UPDATE OR DELETE ON team_users FOR EACH ROW EXECUTE FUNCTION team_chat_changed()")
    op.execute("SELECT sync_team_chat(team_id) FROM team ORDER BY team_id")


def downgrade():
    raise RuntimeError("Preserve o histórico: restaure um backup verificado para retornar à versão anterior")
