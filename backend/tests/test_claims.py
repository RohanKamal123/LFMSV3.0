import concurrent.futures

import requests

from conftest import (
    auth_headers, create_found_item, generate_quiz_and_correct_answers,
    register_student,
)


def _submit_claim(server, token, item_id, attempt_id, answers, note="test"):
    return requests.post(
        f"{server}/api/claims/",
        json={"item_id": item_id, "owner_private_info": note, "attempt_id": attempt_id, "quiz_answers": answers},
        headers=auth_headers(token),
    )


def test_correct_answers_approve_the_claim(server, db_engine):
    _, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    _, claimant_token, _ = register_student(server)
    attempt_id, answers = generate_quiz_and_correct_answers(server, db_engine, item_id, claimant_token)

    r = _submit_claim(server, claimant_token, item_id, attempt_id, answers)
    assert r.status_code == 200, r.text
    body = r.json()
    # Regression test: this response intermittently/consistently came back
    # as {} before session.refresh(new_claim) was added - assert the real
    # fields are actually present, not just that the request succeeded.
    assert body["is_verified"] is True
    assert body["status"] == "APPROVED"
    assert body["quiz_score"] == 3
    assert "id" in body


def test_wrong_answers_reject_the_claim(server, db_engine):
    _, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    _, claimant_token, _ = register_student(server)
    attempt_id, correct_answers = generate_quiz_and_correct_answers(server, db_engine, item_id, claimant_token)
    wrong_answers = [{"question": a["question"], "answer": "definitely not the right answer"} for a in correct_answers]

    r = _submit_claim(server, claimant_token, item_id, attempt_id, wrong_answers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["is_verified"] is False
    assert body["status"] == "PENDING"


def test_finder_cannot_claim_own_item(server, db_engine):
    _, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    attempt_id, answers = generate_quiz_and_correct_answers(server, db_engine, item_id, finder_token)
    r = _submit_claim(server, finder_token, item_id, attempt_id, answers)
    assert r.status_code == 400


def test_claiming_an_already_resolved_item_is_rejected(server, db_engine):
    from models import ItemState
    _, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"], state=ItemState.RESOLVED)

    _, claimant_token, _ = register_student(server)
    r = requests.post(f"{server}/api/quiz/generate/{item_id}", headers=auth_headers(claimant_token))
    assert r.status_code == 200
    attempt_id = r.json()["attempt_id"]

    r = _submit_claim(server, claimant_token, item_id, attempt_id, [])
    assert r.status_code == 409


def test_concurrent_claims_exactly_one_wins(server, db_engine):
    """The core P0 regression test: two claimants both pass verification
    for the same item at nearly the same instant. Before the atomic
    UPDATE...WHERE state=ACTIVE guard, both could be approved. Exactly one
    must win; the other must be rejected with 409, not silently approved."""
    _, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    _, token_a, _ = register_student(server)
    _, token_b, _ = register_student(server)

    attempt_a, answers_a = generate_quiz_and_correct_answers(server, db_engine, item_id, token_a)
    attempt_b, answers_b = generate_quiz_and_correct_answers(server, db_engine, item_id, token_b)

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
        fut_a = ex.submit(_submit_claim, server, token_a, item_id, attempt_a, answers_a, "race A")
        fut_b = ex.submit(_submit_claim, server, token_b, item_id, attempt_b, answers_b, "race B")
        res_a = fut_a.result()
        res_b = fut_b.result()

    statuses = sorted([res_a.status_code, res_b.status_code])
    assert statuses == [200, 409], (res_a.status_code, res_a.text, res_b.status_code, res_b.text)

    winner = res_a if res_a.status_code == 200 else res_b
    assert winner.json()["is_verified"] is True

    from sqlmodel import Session
    from models import Item
    with Session(db_engine) as session:
        item = session.get(Item, item_id)
        assert item.state == "PENDING_HANDOVER"
