import requests

from conftest import auth_headers, login, make_staff_or_admin, register_student


def test_admin_agent_requires_admin_role(server, db_engine):
    _, student_token, _ = register_student(server)
    r = requests.post(
        f"{server}/api/admin-agent/ask",
        json={"message": "how many items are there?"},
        headers=auth_headers(student_token),
    )
    assert r.status_code == 403


def test_admin_agent_rejects_empty_message(server, db_engine):
    staff_uiu = make_staff_or_admin(db_engine, "ADMIN")
    admin_token, _ = login(server, staff_uiu)
    r = requests.post(
        f"{server}/api/admin-agent/ask",
        json={"message": "   "},
        headers=auth_headers(admin_token),
    )
    assert r.status_code == 400


def test_admin_agent_degrades_without_ai_key(server, db_engine):
    """Tests always run with GEMINI_API_KEY="" (conftest), so this exercises
    the no-AI-configured fallback reply rather than a real model call."""
    staff_uiu = make_staff_or_admin(db_engine, "ADMIN")
    admin_token, _ = login(server, staff_uiu)
    r = requests.post(
        f"{server}/api/admin-agent/ask",
        json={"message": "how many items are ACTIVE?"},
        headers=auth_headers(admin_token),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "GEMINI_API_KEY" in body["reply"]
    assert body["actions_taken"] == []
