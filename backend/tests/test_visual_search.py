import io

import requests
from PIL import Image


def _test_jpeg_bytes(color=(120, 60, 200)):
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=color).save(buf, format="JPEG")
    buf.seek(0)
    return buf


def test_visual_search_falls_back_without_ai_key(server):
    """Tests always run with GEMINI_API_KEY="" (conftest), so this exercises
    the perceptual-hash fallback path, not the Gemini captioning path."""
    r = requests.post(
        f"{server}/api/visual-search/",
        files={"file": ("query.jpg", _test_jpeg_bytes(), "image/jpeg")},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["mode"] == "phash"
    assert body["caption"] is None
    assert isinstance(body["matches"], list)


def test_visual_search_rejects_non_image(server):
    r = requests.post(
        f"{server}/api/visual-search/",
        files={"file": ("query.txt", io.BytesIO(b"not an image"), "text/plain")},
    )
    assert r.status_code == 400


def test_visual_search_finds_identical_photo(server, db_engine, test_data_dir):
    """A found item whose photo is byte-identical to the query photo should
    come back as a near-perfect phash match."""
    from sqlmodel import Session
    from models import Item, ItemImage, ItemState, User

    query_bytes = _test_jpeg_bytes(color=(10, 200, 90)).getvalue()

    import os
    import uuid

    # Must land under the SERVER SUBPROCESS's DATA_DIR (test_data_dir), not
    # this test process's own cwd - they're different processes/envs.
    upload_dir = os.path.join(test_data_dir, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}.jpg"
    with open(os.path.join(upload_dir, filename), "wb") as f:
        f.write(query_bytes)

    with Session(db_engine) as session:
        finder = session.exec(__import__("sqlmodel").select(User)).first()
        item = Item(
            title="Visual Search Match Test",
            state=ItemState.ACTIVE,
            finder_id=finder.id if finder else None,
            public_description="Test item for visual search matching.",
            private_description="n/a",
        )
        session.add(item)
        session.commit()
        session.refresh(item)
        session.add(ItemImage(item_id=item.id, url=f"/uploads/{filename}", is_primary=True))
        session.commit()
        target_id = item.id

    r = requests.post(
        f"{server}/api/visual-search/",
        files={"file": ("query.jpg", io.BytesIO(query_bytes), "image/jpeg")},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["mode"] == "phash"
    match_ids = [m["id"] for m in body["matches"]]
    assert target_id in match_ids
    matched = next(m for m in body["matches"] if m["id"] == target_id)
    assert matched["similarity"] >= 95.0
