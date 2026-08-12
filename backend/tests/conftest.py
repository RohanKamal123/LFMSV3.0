"""
Shared pytest fixtures for the Find-X backend test suite.

Tests run against a REAL uvicorn server (subprocess) backed by a throwaway
SQLite file, exercising the exact same code path production traffic does -
no ASGI TestClient shortcuts, no mocked HTTP layer. This mirrors how every
P0 fix in this codebase was actually verified during development, and
avoids an unrelated httpx/starlette TestClient version incompatibility
(FastAPI 0.109's pinned Starlette needs httpx<0.28, but google-genai
requires httpx>=0.28 - a real subprocess server sidesteps the conflict
entirely since tests just make normal HTTP requests to it).
"""
import json
import os
import socket
import subprocess
import sys
import time
import uuid

import pytest
import requests

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)  # so `import models`, `from database import ...` etc. work anywhere below

TEST_JWT_SECRET = "test-only-secret-never-used-outside-pytest"
DEMO_PASSWORD = "testpass123"


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def test_data_dir(tmp_path_factory):
    return str(tmp_path_factory.mktemp("findx_test_data"))


def _launch_server(data_dir, extra_env=None):
    port = _free_port()
    env = {
        **os.environ,
        "DATA_DIR": data_dir,
        "JWT_SECRET": TEST_JWT_SECRET,
        "GEMINI_API_KEY": "",  # force the deterministic fallback paths, not real Gemini calls
        **(extra_env or {}),
    }
    env.pop("RENDER", None)
    env.pop("DATABASE_URL", None)

    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--port", str(port)],
        cwd=BACKEND_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    base_url = f"http://127.0.0.1:{port}"
    deadline = time.time() + 20
    up = False
    while time.time() < deadline:
        try:
            if requests.get(f"{base_url}/", timeout=1).status_code == 200:
                up = True
                break
        except requests.exceptions.ConnectionError:
            time.sleep(0.3)

    if not up:
        proc.terminate()
        output = proc.stdout.read().decode(errors="replace") if proc.stdout else ""
        raise RuntimeError(f"Test server never came up.\n{output}")

    return proc, base_url


def _shutdown_server(proc):
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()


@pytest.fixture(scope="session")
def server(test_data_dir):
    """Shared server for most tests, with rate limiting disabled - nearly
    every test logs in or registers, which would otherwise trip the real
    per-IP limits and fail tests that have nothing to do with rate limiting.
    See tests/test_rate_limit.py for the dedicated, real-limiter server."""
    proc, base_url = _launch_server(test_data_dir, extra_env={"DISABLE_RATE_LIMIT": "1"})
    yield base_url
    _shutdown_server(proc)


@pytest.fixture(scope="function")
def rate_limited_server(tmp_path_factory):
    """A fresh, isolated server with real rate limiting enabled, for tests
    that specifically exercise the limiter itself. Function-scoped (a new
    process per test) so one test's requests can't consume another's rate
    limit budget - both tests share the same in-memory limiter state if
    they shared a server, which would make results depend on test order."""
    data_dir = str(tmp_path_factory.mktemp("findx_rl_test_data"))
    proc, base_url = _launch_server(data_dir)
    yield base_url
    _shutdown_server(proc)


@pytest.fixture(scope="session")
def db_engine(test_data_dir, server):
    """A SQLModel engine pointed at the same SQLite file the test server
    uses, for setup (e.g. creating a staff/admin account) and assertions
    that don't have a dedicated API (e.g. reading a quiz's answer key -
    intentionally never exposed to any client, test or otherwise)."""
    sys.path.insert(0, BACKEND_DIR)
    from sqlmodel import create_engine
    db_path = os.path.join(test_data_dir, "database_v2.db")
    return create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})


def unique_uiu_id(prefix="TEST"):
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def register_student(base_url, uiu_id=None, password=DEMO_PASSWORD):
    uiu_id = uiu_id or unique_uiu_id()
    r = requests.post(f"{base_url}/api/auth/register", json={
        "uiu_id": uiu_id, "name": f"Test {uiu_id}", "contact": f"{uiu_id}@test.local", "password": password,
    })
    assert r.status_code == 200, r.text
    body = r.json()
    return uiu_id, body["token"], body["user"]


def login(base_url, uiu_id, password=DEMO_PASSWORD):
    r = requests.post(f"{base_url}/api/auth/login", json={"uiu_id": uiu_id, "password": password})
    assert r.status_code == 200, r.text
    body = r.json()
    return body["token"], body["user"]


def make_staff_or_admin(db_engine, role, password=DEMO_PASSWORD):
    """Staff/admin accounts are never self-registered (see api/gatekeeper.py) -
    provision one directly in the DB, exactly like a real admin would via a
    seed script or an internal tool."""
    sys.path.insert(0, BACKEND_DIR)
    from sqlmodel import Session
    from models import User, UserRole
    from services.auth import hash_password

    uiu_id = unique_uiu_id(prefix=role)
    with Session(db_engine) as session:
        user = User(
            uiu_id=uiu_id,
            name=f"Test {role}",
            email=f"{uiu_id}@test.local",
            role=UserRole(role),
            password_hash=hash_password(password),
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return uiu_id


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def create_found_item(db_engine, finder_id, private_detail="Specific detail: 1234 serial mark.", state=None):
    """Inserts an ACTIVE found Item directly - category/location are
    optional on this model, so tests don't need to seed reference data."""
    sys.path.insert(0, BACKEND_DIR)
    from sqlmodel import Session
    from models import Item, ItemState

    with Session(db_engine) as session:
        item = Item(
            title=f"Test Item {uuid.uuid4().hex[:6]}",
            state=state or ItemState.ACTIVE,
            finder_id=finder_id,
            public_description="A test item was found. Please contact if this belongs to you.",
            private_description=private_detail,
        )
        session.add(item)
        session.commit()
        session.refresh(item)
        return item.id


def generate_quiz_and_correct_answers(base_url, db_engine, item_id, token):
    """Generates a real quiz via the API, then reads the server-only answer
    key directly from the DB (never exposed to any client) to build a
    payload that should pass verification."""
    sys.path.insert(0, BACKEND_DIR)
    from sqlmodel import Session
    from models import QuizAttempt

    r = requests.post(f"{base_url}/api/quiz/generate/{item_id}", headers=auth_headers(token))
    assert r.status_code == 200, r.text
    attempt_id = r.json()["attempt_id"]

    with Session(db_engine) as session:
        attempt = session.get(QuizAttempt, attempt_id)
        questions = json.loads(attempt.questions_json)

    answers = [{"question": q["question"], "answer": q["options"][q["correct_index"]]} for q in questions]
    return attempt_id, answers
