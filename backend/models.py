from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(150),
        nullable=False,
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    hashed_password = Column(
        String(255),
        nullable=False,
    )

    role = Column(
        String(50),
        nullable=False,
        default="participant",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )


# ============================================================
# CONFERENCE
# ============================================================

class Conference(Base):
    __tablename__ = "conferences"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(200),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    venue = Column(
        String(250),
        nullable=True,
    )

    start_date = Column(
        String(50),
        nullable=True,
    )

    end_date = Column(
        String(50),
        nullable=True,
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    sponsors = relationship(
        "Sponsor",
        back_populates="conference",
        cascade="all, delete-orphan",
    )

    exhibitors = relationship(
        "Exhibitor",
        back_populates="conference",
        cascade="all, delete-orphan",
    )

    sessions = relationship(
        "Session",
        back_populates="conference",
        cascade="all, delete-orphan",
    )


# ============================================================
# SESSION
# ============================================================

class Session(Base):
    __tablename__ = "sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    conference_id = Column(
        Integer,
        ForeignKey("conferences.id"),
        nullable=False,
        index=True,
    )

    title = Column(
        String(200),
        nullable=False,
    )

    speaker_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    start_time = Column(
        DateTime,
        nullable=False,
    )

    end_time = Column(
        DateTime,
        nullable=False,
    )

    location = Column(
        String(250),
        nullable=True,
    )

    room_capacity = Column(
        Integer,
        nullable=False,
    )

    expected_attendees = Column(
        Integer,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    conference = relationship(
        "Conference",
        back_populates="sessions",
    )

    speaker = relationship(
        "User",
        foreign_keys=[speaker_id],
    )


# ============================================================
# SPONSOR
# ============================================================

class Sponsor(Base):
    __tablename__ = "sponsors"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(200),
        nullable=False,
    )

    tier = Column(
        String(50),
        nullable=True,
    )

    contact_email = Column(
        String(255),
        nullable=True,
    )

    contact_phone = Column(
        String(50),
        nullable=True,
    )

    website = Column(
        String(500),
        nullable=True,
    )

    conference_id = Column(
        Integer,
        ForeignKey("conferences.id"),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    conference = relationship(
        "Conference",
        back_populates="sponsors",
    )


# ============================================================
# EXHIBITOR
# ============================================================

class Exhibitor(Base):
    __tablename__ = "exhibitors"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(200),
        nullable=False,
    )

    booth_number = Column(
        String(50),
        nullable=True,
    )

    contact_email = Column(
        String(255),
        nullable=True,
    )

    description = Column(
        Text,
        nullable=True,
    )

    conference_id = Column(
        Integer,
        ForeignKey("conferences.id"),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    conference = relationship(
        "Conference",
        back_populates="exhibitors",
    )
