from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend import models
from backend.auth import get_current_user, require_role
from backend.database import get_db


router = APIRouter(prefix="/sessions", tags=["Sessions"])
rooms_router = APIRouter(prefix="/rooms", tags=["Rooms"])


class SessionCreate(BaseModel):
    conference_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=200)
    speaker_id: Optional[int] = Field(default=None, gt=0)
    start_time: datetime
    end_time: datetime
    location: str = Field(min_length=1, max_length=250)
    room_capacity: int = Field(gt=1)
    expected_attendees: int = Field(ge=0)

    @field_validator("title", "location")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


class SpeakerAssign(BaseModel):
    speaker_id: int = Field(gt=0)


class SpeakerConfirmation(BaseModel):
    confirmed: bool


class RoomUpdate(BaseModel):
    location: str = Field(min_length=1, max_length=250)
    room_capacity: int = Field(gt=1)

    @field_validator("location")
    @classmethod
    def reject_blank_location(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Location cannot be blank")
        return value


def session_to_response(session: models.Session) -> dict:
    return {
        "id": session.id,
        "conference_id": session.conference_id,
        "title": session.title,
        "speaker_id": session.speaker_id,
        "speaker_confirmed": session.speaker_confirmed,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "location": session.location,
        "room_capacity": session.room_capacity,
        "expected_attendees": session.expected_attendees,
    }


def get_owned_conference(
    db: Session, conference_id: int, current_user: models.User
) -> models.Conference:
    conference = db.query(models.Conference).filter(models.Conference.id == conference_id).first()
    if not conference:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conference not found")
    if conference.organizer_id != current_user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "You can only manage sessions for your own conferences",
        )
    return conference


def get_owned_session(
    db: Session, session_id: int, current_user: models.User
) -> models.Session:
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    get_owned_conference(db, session.conference_id, current_user)
    return session


def time_ranges_overlap(
    first_start: datetime,
    first_end: datetime,
    second_start: datetime,
    second_end: datetime,
) -> bool:
    return first_start < second_end and first_end > second_start


def find_conflicting_sessions(
    db: Session,
    conference_id: int,
    start_time: datetime,
    end_time: datetime,
    *,
    location: Optional[str] = None,
    speaker_id: Optional[int] = None,
    excluded_session_id: Optional[int] = None,
) -> list[models.Session]:
    query = db.query(models.Session).filter(
        models.Session.conference_id == conference_id,
        models.Session.start_time < end_time,
        models.Session.end_time > start_time,
    )
    if excluded_session_id is not None:
        query = query.filter(models.Session.id != excluded_session_id)
    if location is not None:
        query = query.filter(func.lower(models.Session.location) == location.lower())
    if speaker_id is not None:
        query = query.filter(models.Session.speaker_id == speaker_id)
    return query.all()


def validate_session_timing(
    conference: models.Conference,
    start_time: datetime,
    end_time: datetime,
) -> None:
    if end_time <= start_time:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Session end time must be after its start time")

    try:
        conference_start = datetime.fromisoformat(conference.start_date).date()
        conference_end = datetime.fromisoformat(conference.end_date).date()
    except (TypeError, ValueError):
        return

    if start_time.date() < conference_start or end_time.date() > conference_end:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Session times must fall within the conference start and end dates",
        )


def get_speaker(db: Session, speaker_id: int) -> models.User:
    speaker = db.query(models.User).filter(
        models.User.id == speaker_id,
        models.User.role == "speaker",
    ).first()
    if not speaker:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Speaker not found. Select a registered user with the speaker role",
        )
    return speaker


@router.get("/speakers")
def list_speakers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("organizer")),
):
    speakers = db.query(models.User).filter(models.User.role == "speaker").all()
    return [{"id": speaker.id, "name": speaker.name, "email": speaker.email} for speaker in speakers]

@router.get("/my-schedule")
def my_schedule(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    registered_conference_ids = [
        registration.conference_id
        for registration in db.query(models.Registration)
        .filter(models.Registration.user_id == current_user.id)
        .all()
    ]

    if not registered_conference_ids:
        return []

    sessions = (
        db.query(models.Session)
        .filter(models.Session.conference_id.in_(registered_conference_ids))
        .order_by(models.Session.start_time)
        .all()
    )

    return [session_to_response(session) for session in sessions]

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("organizer")),
):
    conference = get_owned_conference(db, payload.conference_id, current_user)
    validate_session_timing(conference, payload.start_time, payload.end_time)
    if payload.expected_attendees > payload.room_capacity:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Expected attendees cannot exceed room capacity")

    room_conflicts = find_conflicting_sessions(
        db, conference.id, payload.start_time, payload.end_time, location=payload.location
    )
    if room_conflicts:
        raise HTTPException(status.HTTP_409_CONFLICT, "This room already has an overlapping session")

    if payload.speaker_id is not None:
        get_speaker(db, payload.speaker_id)
        speaker_conflicts = find_conflicting_sessions(
            db,
            conference.id,
            payload.start_time,
            payload.end_time,
            speaker_id=payload.speaker_id,
        )
        if speaker_conflicts:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "This speaker is already assigned to an overlapping session",
            )

    session = models.Session(
        conference_id=conference.id,
        title=payload.title,
        speaker_id=payload.speaker_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        location=payload.location,
        room_capacity=payload.room_capacity,
        expected_attendees=payload.expected_attendees,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session_to_response(session)


@router.post("/{session_id}/assign-speaker")
def assign_speaker(
    session_id: int,
    payload: SpeakerAssign,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("organizer")),
):
    session = get_owned_session(db, session_id, current_user)
    get_speaker(db, payload.speaker_id)
    speaker_conflicts = find_conflicting_sessions(
        db,
        session.conference_id,
        session.start_time,
        session.end_time,
        speaker_id=payload.speaker_id,
        excluded_session_id=session.id,
    )
    if speaker_conflicts:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This speaker is already assigned to an overlapping session",
        )
    session.speaker_id = payload.speaker_id
    session.speaker_confirmed = False
    db.commit()
    db.refresh(session)
    return session_to_response(session)


@router.post("/{session_id}/confirm-speaker")
def confirm_speaker(
    session_id: int,
    payload: SpeakerConfirmation,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("organizer")),
):
    session = get_owned_session(db, session_id, current_user)
    if payload.confirmed and session.speaker_id is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "A speaker must be assigned before the session can be confirmed",
        )
    session.speaker_confirmed = payload.confirmed
    db.commit()
    db.refresh(session)
    return session_to_response(session)


@rooms_router.get("/utilization")
def utilization(conference_id: int, db: Session = Depends(get_db)):
    conference = db.query(models.Conference).filter(models.Conference.id == conference_id).first()
    if not conference:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conference not found")

    sessions = db.query(models.Session).filter(
        models.Session.conference_id == conference_id
    ).order_by(models.Session.start_time).all()
    data = []
    for session in sessions:
        percent = round(session.expected_attendees / session.room_capacity * 100, 2)
        room_status = "overcrowded" if percent > 90 else "efficient" if percent >= 60 else "underutilized"
        data.append({
            "session_id": session.id,
            "session_title": session.title,
            "room": session.location,
            "room_capacity": session.room_capacity,
            "expected_attendees": session.expected_attendees,
            "utilization_pct": percent,
            "status": room_status,
        })
    average = round(sum(item["utilization_pct"] for item in data) / len(data), 2) if data else 0
    return {"total_sessions": len(data), "average_utilization": average, "sessions": data}


@rooms_router.get("/suggestions")
def suggestions(conference_id: int, db: Session = Depends(get_db)):
    conference = db.query(models.Conference).filter(models.Conference.id == conference_id).first()
    if not conference:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conference not found")

    sessions = db.query(models.Session).filter(models.Session.conference_id == conference_id).all()
    crowded_sessions = [session for session in sessions if session.expected_attendees > session.room_capacity]
    suggestions_list = []
    for crowded in crowded_sessions:
        for candidate in sessions:
            if candidate.id == crowded.id or candidate.room_capacity < crowded.expected_attendees:
                continue
            if time_ranges_overlap(crowded.start_time, crowded.end_time, candidate.start_time, candidate.end_time):
                continue
            suggestions_list.append({
                "session_id": crowded.id,
                "suggested_room": candidate.location,
                "suggested_capacity": candidate.room_capacity,
                "reason": (
                    f"{crowded.title} exceeds capacity, while {candidate.location} "
                    "is free during this session's time slot"
                ),
            })
    return suggestions_list


@router.patch("/{session_id}/room")
def update_room(
    session_id: int,
    payload: RoomUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("organizer")),
):
    session = get_owned_session(db, session_id, current_user)
    if session.expected_attendees > payload.room_capacity:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Room capacity cannot be lower than expected attendees")
    room_conflicts = find_conflicting_sessions(
        db,
        session.conference_id,
        session.start_time,
        session.end_time,
        location=payload.location,
        excluded_session_id=session.id,
    )
    if room_conflicts:
        raise HTTPException(status.HTTP_409_CONFLICT, "This room already has an overlapping session")
    session.location = payload.location
    session.room_capacity = payload.room_capacity
    db.commit()
    db.refresh(session)
    return session_to_response(session)
