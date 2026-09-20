from datetime import datetime
from database import SessionLocal, Base, engine
import models

# Ensure tables are created
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # 1. Create or retrieve User (ID: 1)
    user = db.query(models.User).filter_by(id=1).first()
    if not user:
        user = models.User(
            id=1,
            email="test@example.com",
            name="Test User",
            role="attendee"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 2. Create or retrieve Conference (ID: 1)
    conf = db.query(models.Conference).filter_by(id=1).first()
    if not conf:
        conf = models.Conference(
            id=1,
            name="Tech Conf 2026",
            description="Annual tech conference",
            venue="Main Hall",
            created_by=user.id
        )
        db.add(conf)
        db.commit()
        db.refresh(conf)

    # 3. Create Session using Python datetime objects
    session = models.Session(
        conference_id=conf.id,
        title="AI Keynote",
        start_time=datetime(2026, 9, 3, 10, 0, 0),
        end_time=datetime(2026, 9, 3, 11, 0, 0),
        location="Room A",
        room_capacity=100
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # 4. Mark User 1 as Attended
    attendance = models.Attendance(
        user_id=user.id,
        session_id=session.id,
        attended=True
    )
    db.add(attendance)
    db.commit()

    print("Successfully seeded test data! User ID 1 now has verified attendance.")

except Exception as e:
    db.rollback()
    print(f"Error seeding data: {e}")

finally:
    db.close()