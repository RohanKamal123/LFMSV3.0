import os
from typing import List, Optional, Tuple

import sqlite_vec
from sqlalchemy import event
from sqlmodel import Session

from services.ai_client import get_client

EMBED_MODEL = os.environ.get("GEMINI_EMBED_MODEL", "gemini-embedding-001")
EMBED_DIM = 768
# Cosine distance (0 = identical, 2 = opposite). Calibrated empirically:
# genuine matches land around 0.07-0.15, while same-category-but-different
# items and unrelated queries land at 0.29+, so 0.20 separates them cleanly.
SIMILARITY_THRESHOLD = 0.20


_vec_available = False


def is_vec_available() -> bool:
    return _vec_available


def register_vec_extension(engine) -> None:
    """Loads the sqlite-vec extension on every new DBAPI connection this
    engine opens. Must be called once, right after the engine is created.

    Some Python builds (notably Render's default Python buildpack) ship a
    sqlite3 module compiled without loadable-extension support at all -
    enable_load_extension() doesn't exist on the connection object, which
    would otherwise crash the app on startup. Degrade to "semantic
    matching disabled" instead, same pattern as a missing Gemini key."""
    @event.listens_for(engine, "connect")
    def _load_vec_extension(dbapi_connection, connection_record):
        global _vec_available
        try:
            dbapi_connection.enable_load_extension(True)
            sqlite_vec.load(dbapi_connection)
            dbapi_connection.enable_load_extension(False)
            _vec_available = True
        except AttributeError:
            print("sqlite-vec unavailable: this Python's sqlite3 was built without loadable-extension support. Semantic item matching is disabled.")
            _vec_available = False
        except Exception as e:
            print(f"sqlite-vec load failed: {e!r}. Semantic item matching is disabled.")
            _vec_available = False


def ensure_vec_table(engine) -> None:
    if not _vec_available:
        return
    with engine.connect() as conn:
        conn.exec_driver_sql(
            f"CREATE VIRTUAL TABLE IF NOT EXISTS item_vec USING vec0("
            f"id INTEGER PRIMARY KEY, embedding float[{EMBED_DIM}] distance_metric=cosine)"
        )
        conn.commit()


def _embed_text(text: str) -> Optional[List[float]]:
    client = get_client()
    if not client:
        return None
    try:
        from google.genai import types
        response = client.models.embed_content(
            model=EMBED_MODEL,
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=EMBED_DIM),
        )
        return list(response.embeddings[0].values)
    except Exception as e:
        print(f"Embedding failed (model={EMBED_MODEL}): {e!r}")
        return None


def index_item(session: Session, engine, item_type: str, item_id: int, text: str) -> None:
    """Computes and stores an embedding for a newly created Item/LostItem.
    Best-effort: silently no-ops if the AI call fails (no key, quota, etc)
    or sqlite-vec isn't available on this platform, so it never blocks the
    report-item request that triggered it."""
    if not _vec_available:
        return

    vector = _embed_text(text)
    if vector is None:
        return

    from models import ItemEmbedding
    record = ItemEmbedding(item_type=item_type, item_id=item_id)
    session.add(record)
    session.commit()
    session.refresh(record)

    with engine.connect() as conn:
        conn.exec_driver_sql(
            "INSERT INTO item_vec(id, embedding) VALUES (?, ?)",
            (record.id, sqlite_vec.serialize_float32(vector)),
        )
        conn.commit()


def find_similar(session: Session, engine, text: str, opposite_type: str, k: int = 5) -> List[Tuple[int, float]]:
    """Returns up to k (item_id, distance) pairs of `opposite_type` items
    whose embedding is within SIMILARITY_THRESHOLD of `text`. Best-effort:
    returns [] on any failure (no key, no rows indexed yet, sqlite-vec
    unavailable on this platform, etc)."""
    if not _vec_available:
        return []

    vector = _embed_text(text)
    if vector is None:
        return []

    try:
        with engine.connect() as conn:
            # Over-fetch since results mix both item types; we filter below.
            rows = conn.exec_driver_sql(
                "SELECT id, distance FROM item_vec WHERE embedding MATCH ? AND k = ? ORDER BY distance",
                (sqlite_vec.serialize_float32(vector), k * 4),
            ).fetchall()
    except Exception as e:
        print(f"Vector search failed: {e!r}")
        return []

    from models import ItemEmbedding
    results = []
    for emb_id, distance in rows:
        if distance > SIMILARITY_THRESHOLD:
            continue
        record = session.get(ItemEmbedding, emb_id)
        if record and record.item_type == opposite_type:
            results.append((record.item_id, distance))
        if len(results) >= k:
            break
    return results
