import requests

from conftest import (
    auth_headers, create_found_item, generate_quiz_and_correct_answers,
    make_staff_or_admin, login, register_student,
)


def _submit_claim(server, token, item_id, attempt_id, answers):
    return requests.post(
        f"{server}/api/claims/",
        json={"item_id": item_id, "owner_private_info": "test", "attempt_id": attempt_id, "quiz_answers": answers},
        headers=auth_headers(token),
    )


def test_lookup_requires_staff_role(server, db_engine):
    _, finder_token, finder = register_student(server)
    r = requests.get(f"{server}/api/handover/lookup", params={"token": "anything"}, headers=auth_headers(finder_token))
    assert r.status_code == 403


def test_lookup_rejects_invalid_token(server, db_engine):
    staff_uiu = make_staff_or_admin(db_engine, "STAFF")
    staff_token, _ = login(server, staff_uiu)

    r = requests.get(f"{server}/api/handover/lookup", params={"token": "not-a-real-token"}, headers=auth_headers(staff_token))
    assert r.status_code == 401


def test_lookup_surfaces_pending_dropoff(server, db_engine):
    """A finder with an item stuck at PENDING_HANDOVER shows up as a
    drop-off when staff scans their personal QR - this replaces the old
    item-tag QR scan for intake."""
    from models import ItemState

    _, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"], state=ItemState.PENDING_HANDOVER)

    visitor_qr = requests.get(f"{server}/api/auth/qr-token", headers=auth_headers(finder_token)).json()["token"]

    staff_uiu = make_staff_or_admin(db_engine, "STAFF")
    staff_token, _ = login(server, staff_uiu)

    r = requests.get(f"{server}/api/handover/lookup", params={"token": visitor_qr}, headers=auth_headers(staff_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["visitor"]["uiu_id"] == finder["uiu_id"]
    assert [i["id"] for i in body["dropoffs"]] == [item_id]
    assert body["pickups"] == []


def test_lookup_surfaces_ready_pickup(server, db_engine):
    """A claimant with an approved claim on a READY_FOR_PICKUP item shows up
    as a pickup when staff scans their personal QR - this replaces the old
    per-session dynamic QR join flow."""
    finder_uiu, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    _, claimant_token, claimant = register_student(server)
    attempt_id, answers = generate_quiz_and_correct_answers(server, db_engine, item_id, claimant_token)
    claim_res = _submit_claim(server, claimant_token, item_id, attempt_id, answers)
    assert claim_res.status_code == 200, claim_res.text

    staff_uiu = make_staff_or_admin(db_engine, "STAFF")
    staff_token, _ = login(server, staff_uiu)

    # Move the item through Room 110 intake so it's actually at READY_FOR_PICKUP.
    intake = requests.post(f"{server}/api/handover/staff-scan-tag", params={"item_id": item_id}, headers=auth_headers(staff_token))
    assert intake.status_code == 200, intake.text

    visitor_qr = requests.get(f"{server}/api/auth/qr-token", headers=auth_headers(claimant_token)).json()["token"]

    r = requests.get(f"{server}/api/handover/lookup", params={"token": visitor_qr}, headers=auth_headers(staff_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["visitor"]["uiu_id"] == claimant["uiu_id"]
    assert body["dropoffs"] == []
    assert [i["id"] for i in body["pickups"]] == [item_id]

    # And staff can complete the pickup using the resolved uiu_id, exactly
    # as the release button in StaffPanel now does.
    release = requests.post(
        f"{server}/api/handover/staff-scan-claimer",
        params={"item_id": item_id, "claimant_uiu_id": claimant["uiu_id"]},
        headers=auth_headers(staff_token),
    )
    assert release.status_code == 200, release.text
    assert release.json()["item"]["state"] == "RESOLVED"
