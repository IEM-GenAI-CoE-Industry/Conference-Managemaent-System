"""Focused checks for Conference and Session scheduling safeguards."""
from datetime import datetime
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient
from sqlalchemy import create_engine

from backend.auth import hash_password
from backend.database import Base, SessionLocal
from backend.main import app
from backend.models import User


def run():
    with TemporaryDirectory() as temp_dir:
        database_path = Path(temp_dir) / "sessions-test.db"
        engine = create_engine(
            f"sqlite:///{database_path}",
            connect_args={"check_same_thread": False},
        )
        SessionLocal.configure(bind=engine)
        Base.metadata.create_all(bind=engine)

        db = SessionLocal()
        try:
            organizer = User(
                username="Organizer One",
                email="organizer.one@test.com",
                password=hash_password("password123"),
                role="organizer",
            )
            other_organizer = User(
                username="Organizer Two",
                email="organizer.two@test.com",
                password=hash_password("password123"),
                role="organizer",
            )
            speaker = User(
                username="Demo Speaker",
                email="speaker@test.com",
                password=hash_password("password123"),
                role="speaker",
            )
            db.add_all([organizer, other_organizer, speaker])
            db.commit()
            db.refresh(speaker)
        finally:
            db.close()

        client = TestClient(app)

        def login(email):
            response = client.post("/auth/login", json={"email": email, "password": "password123"})
            assert response.status_code == 200, response.text
            return {"Authorization": f"Bearer {response.json()['access_token']}"}

        organizer_headers = login("organizer.one@test.com")
        other_headers = login("organizer.two@test.com")

        response = client.post(
            "/conferences/",
            headers=organizer_headers,
            json={
                "name": "Scheduling Test Conference",
                "description": "Temporary test conference",
                "start_date": "2026-10-15",
                "end_date": "2026-10-16",
                "location": "Test Campus",
            },
        )
        assert response.status_code == 201, response.text
        conference_id = response.json()["id"]

        valid_session = {
            "conference_id": conference_id,
            "title": "Opening Session",
            "speaker_id": speaker.id,
            "start_time": "2026-10-15T10:00:00",
            "end_time": "2026-10-15T11:00:00",
            "location": "Auditorium A",
            "room_capacity": 100,
            "expected_attendees": 80,
        }
        response = client.post("/sessions/", headers=organizer_headers, json=valid_session)
        assert response.status_code == 201, response.text
        session_id = response.json()["id"]

        response = client.post(
            "/sessions/",
            headers=organizer_headers,
            json={**valid_session, "title": "Room Conflict"},
        )
        assert response.status_code == 409, response.text

        response = client.post(
            "/sessions/",
            headers=organizer_headers,
            json={
                **valid_session,
                "title": "Capacity Error",
                "location": "Auditorium B",
                "start_time": "2026-10-15T12:00:00",
                "end_time": "2026-10-15T13:00:00",
                "expected_attendees": 101,
            },
        )
        assert response.status_code == 400, response.text

        response = client.patch(
            f"/sessions/{session_id}/room",
            headers=other_headers,
            json={"location": "Auditorium B", "room_capacity": 100},
        )
        assert response.status_code == 403, response.text

        response = client.post(
            f"/sessions/{session_id}/confirm-speaker",
            headers=organizer_headers,
            json={"confirmed": True},
        )
        assert response.status_code == 200, response.text

        response = client.post(
            "/sessions/",
            headers=organizer_headers,
            json={
                **valid_session,
                "title": "Outside Conference",
                "location": "Auditorium C",
                "start_time": "2026-10-17T10:00:00",
                "end_time": "2026-10-17T11:00:00",
            },
        )
        assert response.status_code == 400, response.text

    print("CONFERENCE AND SESSION SAFEGUARDS PASSED")


if __name__ == "__main__":
    run()
