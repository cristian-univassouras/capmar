"""Normaliza tags existentes e prepara busca sem acentos."""
import unicodedata

from alembic import op
import sqlalchemy as sa

revision = "0003_vitrine"
down_revision = "0002_security"
branch_labels = depends_on = None


def upgrade():
    bind = op.get_bind()
    # Em produção, o administrador pode provisionar a extensão antes da migração.
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public")
    if bind.scalar(sa.text("SELECT extnamespace::regnamespace::text FROM pg_extension WHERE extname='unaccent'")) != "public":
        raise RuntimeError("A extensão unaccent deve estar no schema public")
    rows = bind.execute(sa.text("SELECT keyword_id, word FROM keywords ORDER BY keyword_id")).all()
    groups = {}
    for kid, raw in rows:
        word = " ".join(unicodedata.normalize("NFKC", raw).casefold().split())
        if not 1 <= len(word) <= 20 or any(unicodedata.category(c).startswith("C") for c in word):
            raise RuntimeError(f"Palavra-chave legada inválida: id={kid}; revise sem truncar")
        groups.setdefault(word, []).append((kid, raw))
    for word, entries in groups.items():
        # Prefere a linha já normalizada, evitando colisão ao renomear a canônica.
        canonical = next((kid for kid, raw in entries if raw == word), entries[0][0])
        for duplicate, _ in entries:
            if duplicate == canonical:
                continue
            for table, parent in (("projects_keywords", "project_id"), ("team_keywords", "team_id"), ("user_keywords", "user_id")):
                bind.execute(sa.text(f"INSERT INTO {table} ({parent},keyword_id) SELECT {parent},:canonical FROM {table} WHERE keyword_id=:duplicate ON CONFLICT DO NOTHING"),
                             {"canonical": canonical, "duplicate": duplicate})
                bind.execute(sa.text(f"DELETE FROM {table} WHERE keyword_id=:duplicate"), {"duplicate": duplicate})
            bind.execute(sa.text("DELETE FROM keywords WHERE keyword_id=:duplicate"), {"duplicate": duplicate})
        bind.execute(sa.text("UPDATE keywords SET word=:word WHERE keyword_id=:kid"), {"word": word, "kid": canonical})
    if bind.scalar(sa.text("SELECT count(*) FROM (SELECT project_id FROM projects_keywords GROUP BY project_id HAVING count(*) > 8) oversized")):
        raise RuntimeError("Projetos legados têm mais de 8 tags; revise antes de migrar")
    op.create_check_constraint("keyword_word_length", "keywords", "length(trim(word)) BETWEEN 1 AND 20")
    op.create_index("ix_project_category_id", "project", ["category_id"])
    op.create_index("ix_project_owner_id", "project", ["owner_id"])


def downgrade():
    raise RuntimeError("Normalização de tags não é desfeita automaticamente; restaure backup verificado")
