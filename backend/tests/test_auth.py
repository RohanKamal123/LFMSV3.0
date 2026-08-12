import requests

from conftest import (
    DEMO_PASSWORD, auth_headers, login, register_student, unique_uiu_id,
)


def test_register_creates_student_only(server):
    """Self-registration must never let a client choose a privileged role -
    this is a real P0 fix (the old /login accepted any client-supplied role
    including ADMIN). The register endpoint doesn't even take a role field,
    so this asserts the server-side default holds regardless."""
    _, _, user = register_student(server)
    assert user["role"] == "STUDENT"


def test_duplicate_registration_rejected(server):
    uiu_id = unique_uiu_id()
    register_student(server, uiu_id=uiu_id)
    r = requests.post(f"{server}/api/auth/register", json={
        "uiu_id": uiu_id, "name": "Dup", "contact": "dup@test.local", "password": DEMO_PASSWORD,
    })
    assert r.status_code == 409


def test_login_wrong_password_rejected(server):
    uiu_id, _, _ = register_student(server)
    r = requests.post(f"{server}/api/auth/login", json={"uiu_id": uiu_id, "password": "wrong-password"})
    assert r.status_code == 401


def test_login_correct_password_succeeds(server):
    uiu_id, _, _ = register_student(server)
    token, user = login(server, uiu_id)
    assert token
    assert user["uiu_id"] == uiu_id


def test_login_unknown_user_rejected(server):
    r = requests.post(f"{server}/api/auth/login", json={"uiu_id": "no-such-user", "password": "whatever"})
    assert r.status_code == 401


def test_me_requires_valid_token(server):
    r = requests.get(f"{server}/api/auth/me")
    assert r.status_code == 403  # no Authorization header at all

    r = requests.get(f"{server}/api/auth/me", headers=auth_headers("garbage.not.a.token"))
    assert r.status_code == 401


def test_me_returns_the_authenticated_user(server):
    uiu_id, token, _ = register_student(server)
    r = requests.get(f"{server}/api/auth/me", headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["uiu_id"] == uiu_id
