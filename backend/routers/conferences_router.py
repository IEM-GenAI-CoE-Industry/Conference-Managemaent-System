from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.auth import require_role
from backend.database import get_db
import backend.models as models

MOCK_CONFERENCE_ID = 1
MOCK_SESSION_ID = 1
MOCK_USER_ID = 1
MOCK_SUBMISSION_ID = 1
MOCK_PAYMENT_ID = 1


router = APIRouter()


class ConferenceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    location: str


class ConferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    organizer_id: Optional[int] = None


def conference_to_response(conference: models.Conference) -> dict:
    return {
        "id": conference.id,
        "name": conference.name,
        "description": conference.description,
        "start_date": conference.start_date,
        "end_date": conference.end_date,
        "location": conference.venue,
        "organizer_id": conference.created_by,
    }


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


def get_session_model():
    session_model = getattr(models, "Session", None)
    if session_model is None:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Session model is not available in models.py yet.",
        )

    return session_model


@router.post(
    "/",
    response_model=ConferenceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_conference(
    payload: ConferenceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin", "organizer")),
):
    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conference end date cannot be before start date.",
        )

    conference = models.Conference(
        name=payload.name.strip(),
        description=payload.description,
        start_date=payload.start_date.isoformat(),
        end_date=payload.end_date.isoformat(),
        venue=payload.location.strip(),
        created_by=current_user.id,
    )

    db.add(conference)
    db.commit()
    db.refresh(conference)

    return conference_to_response(conference)


@router.get("/", response_model=List[ConferenceResponse])
def list_conferences(db: Session = Depends(get_db)):
    conferences = db.query(models.Conference).all()
    return [conference_to_response(conference) for conference in conferences]


@router.get("/{conference_id}", response_model=ConferenceResponse)
def get_conference(conference_id: int, db: Session = Depends(get_db)):
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

    return conference_to_response(conference)


@router.get("/{conference_id}/agenda")
def get_conference_agenda(conference_id: int, db: Session = Depends(get_db)):
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

    SessionModel = get_session_model()
    sessions = (
        db.query(SessionModel)
        .filter(SessionModel.conference_id == conference_id)
        .order_by(SessionModel.start_time)
        .all()
    )

    return {
        "conference": conference_to_response(conference),
        "sessions": [session_to_response(session) for session in sessions],
    }
