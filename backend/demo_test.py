"""Smoke test for the working prototype. Run after: python -m backend.seed_demo"""
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def login(email):
    r = client.post("/auth/login", json={"email": email, "password": "demo123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def run():
    assert client.get("/health").status_code == 200
    organizer = login("organizer@demo.com")
    participant = login("participant@demo.com")

    checks = [
        ("/auth/me", organizer),
        ("/conferences/", None),
        ("/conferences/1", None),
        ("/conferences/1/agenda", None),
        ("/dashboard/stats?conference_id=1", organizer),
        ("/resources/forecast?conference_id=1", organizer),
        ("/rooms/utilization?conference_id=1", None),
        ("/rooms/suggestions?conference_id=1", None),
        ("/bottlenecks?conference_id=1", organizer),
        ("/bottlenecks/summary?conference_id=1", organizer),
        ("/reviewers/workload?conference_id=1", organizer),
        ("/reviewers/workload/suggest?conference_id=1", organizer),
        ("/sponsors/?conference_id=1", None),
        ("/exhibitors/?conference_id=1", None),
        ("/registrations/me", participant),
        ("/payments/me", participant),
        ("/attendance/?session_id=1", participant),
    ]
    for path, headers in checks:
        r = client.get(path, headers=headers or {})
        assert r.status_code == 200, f"{path}: {r.status_code} {r.text}"

    # Registration/payment/attendance/feedback write flow for a second participant.
    r = client.post("/registrations/", headers=participant, json={"conference_id": 1, "category": "student"})
    # Seeded participant is already registered, so duplicate is expected.
    assert r.status_code == 400

    r = client.post("/feedback/", headers=participant, json={"session_id": 1, "rating": 5, "comments": "Excellent"})
    assert r.status_code == 200, r.text

    print("ALL PROTOTYPE SMOKE TESTS PASSED")

if __name__ == "__main__":
    run()
