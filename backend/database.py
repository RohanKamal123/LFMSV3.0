from sqlmodel import SQLModel, create_engine, Session
from typing import Generator

sqlite_file_name = "database_v2.db"
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
