import requests

from conftest import auth_headers, create_found_item, register_student


def test_qr_token_has_short_expiry_and_purpose_claim(server):
    _, token, _ = register_student(server)
    r = requests.get(f"{server}/api/auth/qr-token", headers=auth_headers(token))
    assert r.status_code == 200
    body = r.json()
    assert body["expires_in"] <= 120  # short-lived by design, not a session token

    import jwt
    from conftest import TEST_JWT_SECRET
    payload = jwt.decode(body["token"], TEST_JWT_SECRET, algorithms=["HS256"])
    assert payload["purpose"] == "handover_qr"


def test_valid_qr_token_completes_handover(server, db_engine):
    finder_uiu, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    _, claimant_token, claimant = register_student(server)
    qr = requests.get(f"{server}/api/auth/qr-token", headers=auth_headers(claimant_token)).json()["token"]

    r = requests.post(
        f"{server}/api/handover/founder-scan-claimer",
        params={"item_id": item_id, "claimant_token": qr},
        headers=auth_headers(finder_token),
    )
    assert r.status_code == 200, r.text
    # Regression test: this used to come back as {} for the same
    # missing-refresh-after-commit reason as the claims bug.
    assert r.json()["item"]["state"] == "RESOLVED"


def test_tampered_qr_token_rejected(server, db_engine):
    finder_uiu, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    _, claimant_token, _ = register_student(server)
    qr = requests.get(f"{server}/api/auth/qr-token", headers=auth_headers(claimant_token)).json()["token"]
    tampered = qr + "x"

    r = requests.post(
        f"{server}/api/handover/founder-scan-claimer",
        params={"item_id": item_id, "claimant_token": tampered},
        headers=auth_headers(finder_token),
    )
    assert r.status_code == 401


def test_session_token_rejected_as_qr_token(server, db_engine):
    """A long-lived session token must not work as a handover QR token even
    though both are valid JWTs signed with the same secret - the "purpose"
    claim is what actually distinguishes them."""
    finder_uiu, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    _, claimant_token, _ = register_student(server)

    r = requests.post(
        f"{server}/api/handover/founder-scan-claimer",
        params={"item_id": item_id, "claimant_token": claimant_token},
        headers=auth_headers(finder_token),
    )
    assert r.status_code == 400


def test_manual_uiu_id_still_works_as_fallback(server, db_engine):
    finder_uiu, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    claimant_uiu, _, _ = register_student(server)

    r = requests.post(
        f"{server}/api/handover/founder-scan-claimer",
        params={"item_id": item_id, "claimant_uiu_id": claimant_uiu},
        headers=auth_headers(finder_token),
    )
    assert r.status_code == 200


def test_non_finder_cannot_hand_over_item(server, db_engine):
    _, finder_token, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    _, other_token, _ = register_student(server)

    r = requests.post(
        f"{server}/api/handover/founder-scan-claimer",
        params={"item_id": item_id, "claimant_uiu_id": "anyone"},
        headers=auth_headers(other_token),
    )
    assert r.status_code == 403
