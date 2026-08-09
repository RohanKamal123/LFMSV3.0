import os
from sqlmodel import SQLModel, create_engine, Session
from typing import Generator

# DATA_DIR lets a deployment point the SQLite file at a persistent volume
# (e.g. Railway) instead of the container's ephemeral filesystem. Defaults
# to "." so local dev behavior is unchanged.
DATA_DIR = os.environ.get("DATA_DIR", ".")
os.makedirs(DATA_DIR, exist_ok=True)
sqlite_file_name = os.path.join(DATA_DIR, "database_v2.db")
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

from services.embeddings import register_vec_extension, ensure_vec_table
register_vec_extension(engine)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    ensure_vec_table(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
