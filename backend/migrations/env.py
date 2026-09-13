import os
from alembic import context
from sqlalchemy import create_engine, pool
from app.config import settings
from app.database import Base
from app import models  # noqa: F401

config = context.config
url = os.environ.get("MIGRATION_DATABASE_URL", settings.database_url)
if context.is_offline_mode():
    raise RuntimeError("Use migrações online: o baseline inspeciona o banco legado")
engine = create_engine(url, poolclass=pool.NullPool)
with engine.connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata,
                      compare_type=True, transaction_per_migration=True)
    with context.begin_transaction():
        context.run_migrations()
