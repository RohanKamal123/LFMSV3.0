import requests

from conftest import auth_headers, create_found_item, generate_quiz_and_correct_answers, register_student


def _submit_claim(server, token, item_id, attempt_id, answers):
    return requests.post(
        f"{server}/api/claims/",
        json={"item_id": item_id, "owner_private_info": "test", "attempt_id": attempt_id, "quiz_answers": answers},
        headers=auth_headers(token),
    )


def test_claimant_scan_founder_completes_handover(server, db_engine):
    """Reversed Path A: the claimant scans the finder's QR (not the other
    way around) to receive the item directly, in person."""
    finder_uiu, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    _, claimant_token, claimant = register_student(server)
    attempt_id, answers = generate_quiz_and_correct_answers(server, db_engine, item_id, claimant_token)
    claim_res = _submit_claim(server, claimant_token, item_id, attempt_id, answers)
    assert claim_res.status_code == 200, claim_res.text

    finder_qr = requests.get(f"{server}/api/auth/qr-token", headers=auth_headers(finder_token)).json()["token"]

    r = requests.post(
        f"{server}/api/handover/claimant-scan-founder",
        params={"item_id": item_id, "finder_token": finder_qr},
        headers=auth_headers(claimant_token),
    )
    assert r.status_code == 200, r.text
    assert r.json()["item"]["state"] == "RESOLVED"


def test_claimant_scan_founder_rejects_without_approved_claim(server, db_engine):
    finder_uiu, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    _, other_token, _ = register_student(server)
    finder_qr = requests.get(f"{server}/api/auth/qr-token", headers=auth_headers(finder_token)).json()["token"]

    r = requests.post(
        f"{server}/api/handover/claimant-scan-founder",
        params={"item_id": item_id, "finder_token": finder_qr},
        headers=auth_headers(other_token),
    )
    assert r.status_code == 403


def test_claimant_scan_founder_rejects_mismatched_finder_qr(server, db_engine):
    """The scanned QR must belong to the actual finder of this item, not
    just any registered user."""
    finder_uiu, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    _, claimant_token, claimant = register_student(server)
    attempt_id, answers = generate_quiz_and_correct_answers(server, db_engine, item_id, claimant_token)
    assert _submit_claim(server, claimant_token, item_id, attempt_id, answers).status_code == 200

    _, imposter_token, _ = register_student(server)
    imposter_qr = requests.get(f"{server}/api/auth/qr-token", headers=auth_headers(imposter_token)).json()["token"]

    r = requests.post(
        f"{server}/api/handover/claimant-scan-founder",
        params={"item_id": item_id, "finder_token": imposter_qr},
        headers=auth_headers(claimant_token),
    )
    assert r.status_code == 400
