import requests

from conftest import (
    DEMO_PASSWORD, auth_headers, create_found_item, login, make_staff_or_admin,
    register_student,
)


def test_admin_endpoints_reject_no_auth(server):
    assert requests.get(f"{server}/api/admin/items").status_code == 403
    assert requests.get(f"{server}/api/admin-stats/summary-stats").status_code == 403


def test_admin_endpoints_reject_student(server):
    _, token, _ = register_student(server)
    r = requests.get(f"{server}/api/admin/items", headers=auth_headers(token))
    assert r.status_code == 403


def test_admin_endpoints_accept_admin(server, db_engine):
    uiu_id = make_staff_or_admin(db_engine, "ADMIN")
    token, _ = login(server, uiu_id)
    r = requests.get(f"{server}/api/admin/items", headers=auth_headers(token))
    assert r.status_code == 200


def test_staff_only_handover_endpoints_reject_student(server, db_engine):
    finder_uiu, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    r = requests.post(f"{server}/api/handover/take-by-qr", params={"item_id": item_id}, headers=auth_headers(finder_token))
    assert r.status_code == 403


def test_staff_only_handover_endpoints_accept_staff(server, db_engine):
    finder_uiu, _, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    staff_uiu = make_staff_or_admin(db_engine, "STAFF")
    staff_token, _ = login(server, staff_uiu)

    r = requests.post(f"{server}/api/handover/take-by-qr", params={"item_id": item_id}, headers=auth_headers(staff_token))
    assert r.status_code == 200
    assert r.json()["item"]["state"] == "READY_FOR_PICKUP"


def test_claims_require_auth(server):
    r = requests.post(f"{server}/api/claims/", json={"item_id": 1})
    assert r.status_code == 403


def test_quiz_generation_requires_auth(server):
    r = requests.post(f"{server}/api/quiz/generate/1")
    assert r.status_code == 403


def test_admin_cannot_generate_quiz(server, db_engine):
    finder_uiu, _, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    admin_uiu = make_staff_or_admin(db_engine, "ADMIN")
    admin_token, _ = login(server, admin_uiu)

    r = requests.post(f"{server}/api/quiz/generate/{item_id}", headers=auth_headers(admin_token))
    assert r.status_code == 403


def test_admin_cannot_file_claim(server, db_engine):
    finder_uiu, _, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    admin_uiu = make_staff_or_admin(db_engine, "ADMIN")
    admin_token, _ = login(server, admin_uiu)

    r = requests.post(f"{server}/api/claims/", json={"item_id": item_id}, headers=auth_headers(admin_token))
    assert r.status_code == 403
