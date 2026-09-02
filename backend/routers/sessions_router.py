from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import require_role
from database import get_db
import models


MOCK_CONFERENCE_ID = 1
MOCK_SESSION_ID = 1
MOCK_USER_ID = 1
MOCK_SUBMISSION_ID = 1
MOCK_PAYMENT_ID = 1


router = APIRouter()


class SessionCreate(BaseModel):
    conference_id: int
    title: str
    speaker_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    location: str


class SpeakerAssign(BaseModel):
    speaker_id: int


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

    if payload.speaker_id is not None:
        speaker = db.query(models.User).filter(models.User.id == payload.speaker_id).first()
        if not speaker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Speaker not found.",
            )

    session = SessionModel(
        conference_id=payload.conference_id,
        title=payload.title.strip(),
        speaker_id=payload.speaker_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        location=payload.location.strip(),
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

    session.speaker_id = payload.speaker_id
    db.commit()
    db.refresh(session)

    return session_to_response(session)
