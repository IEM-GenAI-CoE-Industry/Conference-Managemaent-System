from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from auth import get_current_user
from database import get_db
from models import Conference, User


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


def conference_to_dict(conference: Conference) -> dict:
    return {
        "id": conference.id,
        "name": conference.name,
        "description": conference.description,
        "start_date": conference.start_date,
        "end_date": conference.end_date,
        "location": conference.location,
        "organizer_id": conference.organizer_id,
    }


def session_to_dict(session) -> dict:
    return {
        "id": session.id,
        "conference_id": session.conference_id,
        "title": session.title,
        "speaker_id": session.speaker_id,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "location": session.location,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_conference(
    conference_data: ConferenceCreate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if conference_data.end_date < conference_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conference end date cannot be before start date",
        )

    conference = Conference(
        name=conference_data.name,
        description=conference_data.description,
        start_date=conference_data.start_date,
        end_date=conference_data.end_date,
        location=conference_data.location,
        organizer_id=current_user.id,
    )

    db.add(conference)
    db.commit()
    db.refresh(conference)

    return conference_to_dict(conference)


@router.get("/")
def list_conferences(db: DBSession = Depends(get_db)):
    conferences = db.query(Conference).all()
    return [conference_to_dict(conference) for conference in conferences]


@router.get("/{conference_id}")
def get_conference(conference_id: int, db: DBSession = Depends(get_db)):
    conference = db.query(Conference).filter(Conference.id == conference_id).first()
    if not conference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conference not found",
        )

    return conference_to_dict(conference)


@router.get("/{conference_id}/agenda")
def get_conference_agenda(conference_id: int, db: DBSession = Depends(get_db)):
    conference = db.query(Conference).filter(Conference.id == conference_id).first()
    if not conference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conference not found",
        )

    sessions = sorted(conference.sessions, key=lambda session: session.start_time)

    return {
        "conference": conference_to_dict(conference),
        "sessions": [session_to_dict(session) for session in sessions],
    }
