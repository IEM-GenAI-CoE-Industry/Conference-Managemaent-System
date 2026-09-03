"""Reset and seed a realistic demo database for the prototype."""
from datetime import datetime, timedelta, timezone
from pathlib import Path

from backend.auth import hash_password
from backend.database import Base, SessionLocal, engine
from backend.models import Attendance, Conference, Feedback, Payment, Registration, Session, Sponsor, Exhibitor, User

DB_PATH = Path(__file__).resolve().parent / "conference.db"


def seed():
    if DB_PATH.exists():
        DB_PATH.unlink()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        users = [
            User(username="Demo Organizer", email="organizer@demo.com", password=hash_password("demo123"), role="organizer"),
            User(username="Demo Participant", email="participant@demo.com", password=hash_password("demo123"), role="participant"),
            User(username="Demo Author", email="author@demo.com", password=hash_password("demo123"), role="author"),
            User(username="Demo Reviewer", email="reviewer@demo.com", password=hash_password("demo123"), role="reviewer"),
            User(username="Demo Speaker", email="speaker@demo.com", password=hash_password("demo123"), role="speaker"),
            User(username="Demo Participant 2", email="participant2@demo.com", password=hash_password("demo123"), role="participant"),
        ]
        db.add_all(users); db.flush()
        organizer, participant, author, reviewer, speaker, participant2 = users

        conference = Conference(title="IEM Tech Conference 2026", description="AI, software engineering and emerging technology conference", location="IEM Campus, Kolkata", start_date="2026-10-15", end_date="2026-10-16", organizer_id=organizer.id)
        db.add(conference); db.flush()

        s1 = Session(conference_id=conference.id, title="Opening Keynote: Future of AI", speaker_id=speaker.id, start_time=datetime(2026,10,15,10,0), end_time=datetime(2026,10,15,11,0), location="Auditorium A", room_capacity=100, expected_attendees=75, speaker_confirmed=True)
        s2 = Session(conference_id=conference.id, title="Generative AI Workshop", speaker_id=speaker.id, start_time=datetime(2026,10,15,11,30), end_time=datetime(2026,10,15,13,0), location="Lab 1", room_capacity=40, expected_attendees=45, speaker_confirmed=False)
        s3 = Session(conference_id=conference.id, title="Cloud & Backend Engineering", start_time=datetime(2026,10,15,14,0), end_time=datetime(2026,10,15,15,0), location="Room B", room_capacity=80, expected_attendees=20, speaker_confirmed=False)
        db.add_all([s1,s2,s3]); db.flush()

        regs = [
            Registration(user_id=participant.id, conference_id=conference.id, category="student"),
            Registration(user_id=author.id, conference_id=conference.id, category="researcher"),
            Registration(user_id=participant2.id, conference_id=conference.id, category="student"),
        ]
        db.add_all(regs); db.flush()
        db.add_all([
            Payment(registration_id=regs[0].id, user_id=participant.id, amount=1000, status="paid", confirmed_at=datetime.now(timezone.utc).replace(tzinfo=None)),
            Payment(registration_id=regs[1].id, user_id=author.id, amount=1500, status="pending", created_at=datetime.now(timezone.utc).replace(tzinfo=None)-timedelta(hours=72)),
            Payment(registration_id=regs[2].id, user_id=participant2.id, amount=1000, status="paid", confirmed_at=datetime.now(timezone.utc).replace(tzinfo=None)),
        ])
        db.add_all([
            Attendance(user_id=participant.id, session_id=s1.id, attended=True),
            Attendance(user_id=participant2.id, session_id=s1.id, attended=True),
            Feedback(user_id=participant.id, session_id=s1.id, conference_id=conference.id, rating=5, comments="Excellent keynote"),
            Feedback(user_id=participant2.id, session_id=s1.id, conference_id=conference.id, rating=4, comments="Very informative"),
            Sponsor(conference_id=conference.id, name="TechNova", tier="gold", contact_email="contact@technova.example"),
            Exhibitor(conference_id=conference.id, name="AI Labs", booth_location="Booth A1", description="AI demonstrations"),
        ])
        db.commit()
        print("Demo database seeded successfully.")
        print("Organizer: organizer@demo.com / demo123")
        print(f"Conference ID: {conference.id}")
        print(f"Session IDs: {s1.id}, {s2.id}, {s3.id}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
