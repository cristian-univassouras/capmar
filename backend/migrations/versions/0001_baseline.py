"""Baseline novo ou legado, incluindo as seis antigas adições improvisadas."""
from alembic import op
import sqlalchemy as sa
from migrations.legacy_schema import Base

revision = "0001_baseline"
down_revision = None
branch_labels = depends_on = None

ADDITIONS = {
    "users": {"avatar_url": sa.String(255)},
    "project": {"owner_id": sa.Integer(), "cover_url": sa.String(255), "logo_url": sa.String(255)},
    "post": {"image_url": sa.String(255)},
    "team": {"leader_id": sa.Integer()},
}


def upgrade():
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind, checkfirst=True)
    for table in Base.metadata.sorted_tables:
        existing = {c["name"] for c in sa.inspect(bind).get_columns(table.name)}
        for column in table.columns:
            if column.name not in existing:
                if column.name not in ADDITIONS.get(table.name, {}):
                    raise RuntimeError(f"Schema legado não reconhecido: falta {table.name}.{column.name}")
                op.add_column(table.name, sa.Column(column.name, ADDITIONS[table.name][column.name], nullable=True))
    category = Base.metadata.tables["category"]
    if bind.scalar(sa.select(sa.func.count()).select_from(category)) == 0:
        op.bulk_insert(category, [{"description": name} for name in (
            "Gastronomia", "Artesanato", "Tecnologia", "Turismo", "Moda", "Serviços",
            "Educação", "Sustentabilidade")])


def downgrade():
    raise RuntimeError("Baseline não é removido automaticamente; restaure backup verificado")
