import requests


def test_login_is_rate_limited_per_ip(rate_limited_server):
    """Runs against its own dedicated server (real limiter enabled) so it
    can't affect - or be affected by - the shared test server's traffic."""
    server = rate_limited_server
    requests.post(f"{server}/api/auth/register", json={
        "uiu_id": "RATE-LIMIT-TEST", "name": "RL", "contact": "rl@test.local", "password": "testpass123",
    })

    statuses = []
    for _ in range(12):
        r = requests.post(f"{server}/api/auth/login", json={"uiu_id": "RATE-LIMIT-TEST", "password": "wrong"})
        statuses.append(r.status_code)

    assert statuses[:10] == [401] * 10
    assert 429 in statuses[10:]


def test_register_is_rate_limited_separately_from_login(rate_limited_server):
    server = rate_limited_server
    statuses = []
    for i in range(7):
        r = requests.post(f"{server}/api/auth/register", json={
            "uiu_id": f"RL-SEP-{i}", "name": "RL", "contact": "rl2@test.local", "password": "testpass123",
        })
        statuses.append(r.status_code)

    assert statuses[:5] == [200] * 5
    assert 429 in statuses[5:]
