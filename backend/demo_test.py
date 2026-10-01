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

    profile = client.get("/auth/me", headers=participant)
    assert profile.status_code == 200, profile.text
    assert profile.json()["email"] == "participant@demo.com"

    updated = client.patch(
        "/auth/profile",
        headers=participant,
        json={"name": "Demo Participant Updated", "email": "participant.updated@demo.com", "password": "newpassword123"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["name"] == "Demo Participant Updated"

    login_again = client.post("/auth/login", json={"email": "participant.updated@demo.com", "password": "newpassword123"})
    assert login_again.status_code == 200, login_again.text

    reviewer_dir = client.get("/users/reviewers", headers=organizer)
    assert reviewer_dir.status_code == 200, reviewer_dir.text
    assert isinstance(reviewer_dir.json(), list) and len(reviewer_dir.json()) >= 1

    speaker_dir = client.get("/users/speakers", headers=organizer)
    assert speaker_dir.status_code == 200, speaker_dir.text
    assert isinstance(speaker_dir.json(), list) and len(speaker_dir.json()) >= 1

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

    # Sponsor/exhibitor management rejects blank names before creating a record.
    r = client.post("/sponsors/", headers=organizer, json={"conference_id": 1, "name": "   ", "tier": "gold"})
    assert r.status_code == 400, r.text

    r = client.post("/exhibitors/", headers=organizer, json={"conference_id": 1, "name": "   "})
    assert r.status_code == 400, r.text

    # Forecast configuration is organizer-only and is reflected immediately.
    r = client.post("/resources/forecast/config?conference_id=1", headers=organizer, json={"attendance_rate_percent": 80})
    assert r.status_code == 200, r.text
    r = client.get("/resources/forecast?conference_id=1")
    assert r.status_code == 200 and r.json()["attendance_rate_percent"] == 80, r.text

    print("ALL PROTOTYPE SMOKE TESTS PASSED")

if __name__ == "__main__":
    run()
