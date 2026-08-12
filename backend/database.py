import os
from sqlmodel import SQLModel, create_engine, Session
from typing import Generator

# DATABASE_URL (e.g. postgresql://user:pass@host/db) switches to Postgres.
# Falls back to a local SQLite file when unset, so local dev/tests keep
# working unchanged. DATA_DIR lets a deployment point the SQLite file at a
# persistent volume instead of the container's ephemeral filesystem when
# Postgres isn't configured.
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # Render (and most managed Postgres providers) hand out "postgres://"
    # URLs, but SQLAlchemy 1.4+ requires the "postgresql://" scheme.
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    IS_SQLITE = False
else:
    DATA_DIR = os.environ.get("DATA_DIR", ".")
    os.makedirs(DATA_DIR, exist_ok=True)
    sqlite_file_name = os.path.join(DATA_DIR, "database_v2.db")
    sqlite_url = f"sqlite:///{sqlite_file_name}"
    connect_args = {"check_same_thread": False}
    engine = create_engine(sqlite_url, connect_args=connect_args)
    IS_SQLITE = True

if IS_SQLITE:
    # sqlite-vec (semantic item matching) is SQLite-only; degrades itself
    # gracefully on platforms where it can't load (see embeddings.py), but
    # there's no equivalent wiring for Postgres yet, so skip it outright
    # rather than let it print a misleading "unavailable" warning.
    from services.embeddings import register_vec_extension, ensure_vec_table
    register_vec_extension(engine)
else:
    def ensure_vec_table(engine) -> None:
        pass

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    ensure_vec_table(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
