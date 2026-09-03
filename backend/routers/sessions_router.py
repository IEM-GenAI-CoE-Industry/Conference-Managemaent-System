from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import require_role
from backend.database import get_db
from backend import models


MOCK_CONFERENCE_ID = 1
MOCK_SESSION_ID = 1
MOCK_USER_ID = 1
MOCK_SUBMISSION_ID = 1
MOCK_PAYMENT_ID = 1


router = APIRouter()
rooms_router = APIRouter()

class SessionCreate(BaseModel):
    conference_id: int
    title: str
    speaker_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    location: str
    room_capacity: int
    expected_attendees: Optional[int] = None


class SpeakerAssign(BaseModel):
    speaker_id: int


class RoomUpdate(BaseModel):
    location: str
    room_capacity: int

def get_session_model():
    session_model = getattr(models, "Session", None)
    if session_model is None:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Session model is not available in models.py yet.",
        )

    return session_model


def session_to_response(session) -> dict:
    return {
        "id": session.id,
        "conference_id": session.conference_id,
        "title": session.title,
        "speaker_id": session.speaker_id,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "location": session.location,
        "room_capacity": session.room_capacity,
        "expected_attendees": session.expected_attendees,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin", "organizer")),
):
    SessionModel = get_session_model()
    conference = (
        db.query(models.Conference)
        .filter(models.Conference.id == payload.conference_id)
        .first()
    )

    if not conference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conference not found.",
        )

    if payload.end_time <= payload.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session end time must be after start time.",
        )

    if payload.room_capacity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room capacity must be greater than zero.",
    )

    if payload.expected_attendees is not None and payload.expected_attendees < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expected attendees cannot be negative.",
    )

    if payload.speaker_id is not None:
        speaker = db.query(models.User).filter(models.User.id == payload.speaker_id).first()
        if not speaker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Speaker not found.",
            )
        if speaker.role != "speaker":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected user does not have the speaker role.",
            )

    session = SessionModel(
        conference_id=payload.conference_id,
        title=payload.title.strip(),
        speaker_id=payload.speaker_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        location=payload.location.strip(),
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
    current_user: models.User = Depends(require_role("admin", "organizer")),
):
    SessionModel = get_session_model()
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    speaker = db.query(models.User).filter(models.User.id == payload.speaker_id).first()
    if not speaker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speaker not found.",
        )

    if speaker.role != "speaker":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected user does not have the speaker role.",
        )

    session.speaker_id = payload.speaker_id
    db.commit()
    db.refresh(session)

    return session_to_response(session)

@rooms_router.get("/utilization")
def room_utilization_optimizer(
    conference_id: int,
    db: Session = Depends(get_db),
):
    SessionModel = get_session_model()

    conference = (
        db.query(models.Conference)
        .filter(models.Conference.id == conference_id)
        .first()
    )

    if not conference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conference not found.",
        )

    sessions = (
        db.query(SessionModel)
        .filter(SessionModel.conference_id == conference_id)
        .all()
    )

    if not sessions:
        return {
            "total_sessions": 0,
            "average_utilization": 0,
            "sessions": [],
        }

    session_data = []
    utilization_values = []

    for session in sessions:
        if session.room_capacity and session.room_capacity > 0:
            expected_attendees = session.expected_attendees or 0

            utilization = (
                expected_attendees / session.room_capacity
            ) * 100

            utilization_values.append(utilization)
            if utilization > 90:
                utilization_status = "overcrowded"
            elif utilization >= 60:
                utilization_status = "efficient"
            else:
                utilization_status = "underutilized"

            session_data.append(
                {
                    "session_id": session.id,
                    "session_title": session.title,
                    "room": session.location,
                    "room_capacity": session.room_capacity,
                    "expected_attendees": expected_attendees,
                    "utilization_pct": round(utilization, 2),
                    "status": utilization_status,
                }
            )

    average_utilization = (
        sum(utilization_values) / len(utilization_values)
        if utilization_values
        else 0
    )

    return {
        "total_sessions": len(sessions),
        "average_utilization": round(average_utilization, 2),
        "sessions": session_data,
    }

@rooms_router.get("/suggestions")
def room_suggestions(
    conference_id: int,
    db: Session = Depends(get_db),
):
    SessionModel = get_session_model()

    conference = (
        db.query(models.Conference)
        .filter(models.Conference.id == conference_id)
        .first()
    )

    if not conference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conference not found.",
        )

    sessions = (
        db.query(SessionModel)
        .filter(SessionModel.conference_id == conference_id)
        .all()
    )

    suggestions = []

    overcrowded_sessions = []
    underutilized_sessions = []

    for session in sessions:
        if not session.room_capacity or session.room_capacity <= 0:
            continue

        expected_attendees = session.expected_attendees or 0
        utilization = (
            expected_attendees / session.room_capacity
        ) * 100

        if utilization > 90:
            overcrowded_sessions.append(session)
        elif utilization < 60:
            underutilized_sessions.append(session)    

    for session_a in overcrowded_sessions:
        for session_b in underutilized_sessions:

            expected_attendees_a = (
                session_a.expected_attendees or 0
            )

            if session_b.room_capacity >= expected_attendees_a:
                suggestions.append(
                    {
                        "session_a_id": session_a.id,
                        "session_b_id": session_b.id,
                        "reason": (
                            f"Session '{session_a.title}' is overcrowded "
                            f"while '{session_b.title}' is underutilized, "
                            "and room B has enough capacity."
                        ),
                        "suggested_swap": (
                            f"Move session {session_a.id} "
                            f"to room {session_b.location}"
                        ),
                    }
                )
    return suggestions

@router.patch("/{session_id}/room")
def update_session_room(
    session_id: int,
    payload: RoomUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_role("admin", "organizer")
    ),
):
    SessionModel = get_session_model()

    session = (
        db.query(SessionModel)
        .filter(SessionModel.id == session_id)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    if payload.room_capacity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room capacity must be greater than zero.",
        )

    session.location = payload.location.strip()
    session.room_capacity = payload.room_capacity

    db.commit()
    db.refresh(session)

    return session_to_response(session)