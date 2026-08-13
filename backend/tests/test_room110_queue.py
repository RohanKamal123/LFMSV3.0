import requests

from conftest import (
    auth_headers, create_found_item, generate_quiz_and_correct_answers,
    login, make_staff_or_admin, register_student,
)


def _submit_claim(server, token, item_id, attempt_id, answers):
    return requests.post(
        f"{server}/api/claims/",
        json={"item_id": item_id, "owner_private_info": "test", "attempt_id": attempt_id, "quiz_answers": answers},
        headers=auth_headers(token),
    )


def test_queue_requires_staff_role(server, db_engine):
    _, student_token, _ = register_student(server)
    r = requests.get(f"{server}/api/handover/queue", headers=auth_headers(student_token))
    assert r.status_code == 403


def test_queue_lists_dropoffs_and_pickups_with_no_scanning(server, db_engine):
    """The whole point: staff sees everyone pending at Room 110 - and can
    act on it directly from the list - with no QR scan on their side."""
    from models import ItemState

    finder_uiu, finder_token, finder = register_student(server)
    dropoff_item_id = create_found_item(db_engine, finder["id"], state=ItemState.PENDING_HANDOVER)

    pickup_finder_uiu, pickup_finder_token, pickup_finder = register_student(server)
    pickup_item_id = create_found_item(db_engine, pickup_finder["id"])
    _, claimant_token, claimant = register_student(server)
    attempt_id, answers = generate_quiz_and_correct_answers(server, db_engine, pickup_item_id, claimant_token)
    assert _submit_claim(server, claimant_token, pickup_item_id, attempt_id, answers).status_code == 200

    staff_uiu = make_staff_or_admin(db_engine, "STAFF")
    staff_token, _ = login(server, staff_uiu)

    # Move the pickup item to READY_FOR_PICKUP via the existing intake step.
    intake = requests.post(f"{server}/api/handover/staff-scan-tag", params={"item_id": pickup_item_id}, headers=auth_headers(staff_token))
    assert intake.status_code == 200, intake.text

    r = requests.get(f"{server}/api/handover/queue", headers=auth_headers(staff_token))
    assert r.status_code == 200, r.text
    body = r.json()

    dropoff_ids = [d["id"] for d in body["dropoffs"]]
    assert dropoff_item_id in dropoff_ids
    dropoff_entry = next(d for d in body["dropoffs"] if d["id"] == dropoff_item_id)
    assert dropoff_entry["person"]["uiu_id"] == finder_uiu
    assert dropoff_entry["serial"] == dropoff_item_id

    pickup_ids = [p["id"] for p in body["pickups"]]
    assert pickup_item_id in pickup_ids
    pickup_entry = next(p for p in body["pickups"] if p["id"] == pickup_item_id)
    assert pickup_entry["person"]["uiu_id"] == claimant["uiu_id"]

    # Staff acts straight off the queue entries - no scan needed for either.
    confirm = requests.post(f"{server}/api/handover/staff-scan-tag", params={"item_id": dropoff_item_id}, headers=auth_headers(staff_token))
    assert confirm.status_code == 200, confirm.text

    release = requests.post(
        f"{server}/api/handover/staff-scan-claimer",
        params={"item_id": pickup_item_id, "claimant_uiu_id": pickup_entry["person"]["uiu_id"]},
        headers=auth_headers(staff_token),
    )
    assert release.status_code == 200, release.text
    assert release.json()["item"]["state"] == "RESOLVED"
