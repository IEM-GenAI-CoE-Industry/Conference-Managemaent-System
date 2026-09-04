
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Boolean, Float
from sqlalchemy.orm import relationship, synonym

from backend.database import Base


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True)

    # Compatibility with the existing auth code/assignment terminology.
    name = synonym("username")
    hashed_password = synonym("password")


class Conference(Base):
    __tablename__ = "conferences"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(250), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(250), nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=utcnow)

    # Backward-compatible aliases used by some teammate code.
    name = synonym("title")
    venue = synonym("location")
    created_by = synonym("organizer_id")

    organizer = relationship("User", foreign_keys=[organizer_id])
    sponsors = relationship("Sponsor", back_populates="conference", cascade="all, delete-orphan")
    exhibitors = relationship("Exhibitor", back_populates="conference", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="conference", cascade="all, delete-orphan")
    registrations = relationship("Registration", back_populates="conference", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    conference_id = Column(Integer, ForeignKey("conferences.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    speaker_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    location = Column(String(250), nullable=True)
    room_capacity = Column(Integer, nullable=False)
    expected_attendees = Column(Integer, nullable=True)
    speaker_confirmed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=utcnow)

    conference = relationship("Conference", back_populates="sessions")
    speaker = relationship("User", foreign_keys=[speaker_id])
    attendance_records = relationship("Attendance", back_populates="session", cascade="all, delete-orphan")
    feedback_records = relationship("Feedback", back_populates="session", cascade="all, delete-orphan")


class Sponsor(Base):
    __tablename__ = "sponsors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(250), nullable=False)
    tier = Column(String(50), nullable=False)
    conference_id = Column(Integer, ForeignKey("conferences.id"), nullable=False, index=True)
    contact_email = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    website = Column(String(500), nullable=True)

    conference = relationship("Conference", back_populates="sponsors")


class Exhibitor(Base):
    __tablename__ = "exhibitors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(250), nullable=False)
    conference_id = Column(Integer, ForeignKey("conferences.id"), nullable=False, index=True)
    booth_location = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

    conference = relationship("Conference", back_populates="exhibitors")


class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    conference_id = Column(Integer, ForeignKey("conferences.id"), nullable=False, index=True)
    category = Column(String(50), nullable=False, default="participant")
    status = Column(String(30), nullable=False, default="registered")
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User")
    conference = relationship("Conference", back_populates="registrations")
    payment = relationship("Payment", back_populates="registration", uselist=False, cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    registration_id = Column(Integer, ForeignKey("registrations.id"), nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    status = Column(String(30), nullable=False, default="pending")
    created_at = Column(DateTime, default=utcnow)
    confirmed_at = Column(DateTime, nullable=True)

    registration = relationship("Registration", back_populates="payment")
    user = relationship("User")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    attended = Column(Boolean, nullable=False, default=False)
    marked_at = Column(DateTime, default=utcnow)

    user = relationship("User")
    session = relationship("Session", back_populates="attendance_records")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    conference_id = Column(Integer, ForeignKey("conferences.id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    session = relationship("Session", back_populates="feedback_records")
    user = relationship("User")
    
    
    
    


# ---------------------------------------------------------------------------
# SUBMISSIONS, REVIEWS, ANNOUNCEMENTS & CERTIFICATES
# ---------------------------------------------------------------------------
class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    conference_id = Column(Integer, ForeignKey("conferences.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    abstract = Column(Text, nullable=False)
    file_url = Column(String(500), nullable=True)
    status = Column(String(50), default="submitted")
    created_at = Column(DateTime, default=datetime.utcnow)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="assigned")
    score = Column(Integer, nullable=True)
    recommendation = Column(String(50), nullable=True)
    comments = Column(Text, nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    conference_id = Column(Integer, ForeignKey("conferences.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    certificate_uuid = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    conference_id = Column(Integer, ForeignKey("conferences.id"), nullable=False)
    issued_at = Column(DateTime, default=datetime.utcnow)


