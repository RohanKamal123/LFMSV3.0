import requests

from conftest import auth_headers, create_found_item, login, make_staff_or_admin, register_student


def test_staff_quick_report_requires_staff_role(server, db_engine):
    _, student_token, _ = register_student(server)
    r = requests.post(
        f"{server}/api/handover/staff-quick-report",
        json={"title": "Walk-in umbrella", "private_description": "Broken clasp, blue"},
        headers=auth_headers(student_token),
    )
    assert r.status_code == 403


def test_staff_quick_report_creates_active_unowned_item(server, db_engine):
    """A walk-in with no Find-X account just hands the item over - staff
    logs it from scratch with no finder attached, and it's immediately
    ACTIVE/claimable even though it's already physically at Room 110."""
    from models import ItemState

    staff_uiu = make_staff_or_admin(db_engine, "STAFF")
    staff_token, _ = login(server, staff_uiu)

    r = requests.post(
        f"{server}/api/handover/staff-quick-report",
        json={"title": "Walk-in umbrella", "private_description": "Broken clasp, blue"},
        headers=auth_headers(staff_token),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["title"] == "Walk-in umbrella"
    assert body["state"] == ItemState.ACTIVE
    assert body["serial"] == body["id"]

    from sqlmodel import Session
    with Session(db_engine) as session:
        from models import Item
        item = session.get(Item, body["id"])
        assert item.finder_id is None


def test_staff_quick_report_requires_title_and_hidden_detail(server, db_engine):
    staff_uiu = make_staff_or_admin(db_engine, "STAFF")
    staff_token, _ = login(server, staff_uiu)

    r = requests.post(
        f"{server}/api/handover/staff-quick-report",
        json={"title": "", "private_description": ""},
        headers=auth_headers(staff_token),
    )
    assert r.status_code == 400


def test_manual_release_marks_item_resolved(server, db_engine):
    """Non-user pickup: staff looks an item up by serial (item id) and
    releases it with no claimant identity to verify online."""
    finder_uiu, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    staff_uiu = make_staff_or_admin(db_engine, "STAFF")
    staff_token, _ = login(server, staff_uiu)

    lookup = requests.get(f"{server}/api/handover/serial/{item_id}", headers=auth_headers(staff_token))
    assert lookup.status_code == 200, lookup.text
    assert lookup.json()["serial"] == item_id

    r = requests.post(
        f"{server}/api/handover/manual-release",
        params={"item_id": item_id, "note": "walk-in verified in person"},
        headers=auth_headers(staff_token),
    )
    assert r.status_code == 200, r.text
    assert r.json()["item"]["state"] == "RESOLVED"


def test_manual_release_rejects_already_resolved(server, db_engine):
    from models import ItemState

    finder_uiu, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"], state=ItemState.RESOLVED)

    staff_uiu = make_staff_or_admin(db_engine, "STAFF")
    staff_token, _ = login(server, staff_uiu)

    r = requests.post(
        f"{server}/api/handover/manual-release",
        params={"item_id": item_id},
        headers=auth_headers(staff_token),
    )
    assert r.status_code == 400


def test_manual_release_requires_staff_role(server, db_engine):
    finder_uiu, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    r = requests.post(
        f"{server}/api/handover/manual-release",
        params={"item_id": item_id},
        headers=auth_headers(finder_token),
    )
    assert r.status_code == 403
