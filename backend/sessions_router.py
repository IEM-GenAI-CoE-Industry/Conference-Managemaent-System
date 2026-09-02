from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from auth import get_current_user
from database import get_db
from models import Conference, Session, User


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


def session_to_dict(session: Session) -> dict:
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
    session_data: SessionCreate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conference = (
        db.query(Conference)
        .filter(Conference.id == session_data.conference_id)
        .first()
    )
    if not conference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conference not found",
        )

    if session_data.end_time <= session_data.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session end time must be after start time",
        )

    if session_data.speaker_id is not None:
        speaker = db.query(User).filter(User.id == session_data.speaker_id).first()
        if not speaker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Speaker not found",
            )

    session = Session(
        conference_id=session_data.conference_id,
        title=session_data.title,
        speaker_id=session_data.speaker_id,
        start_time=session_data.start_time,
        end_time=session_data.end_time,
        location=session_data.location,
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return session_to_dict(session)


@router.post("/{session_id}/assign-speaker")
def assign_speaker(
    session_id: int,
    speaker_data: SpeakerAssign,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    speaker = db.query(User).filter(User.id == speaker_data.speaker_id).first()
    if not speaker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speaker not found",
        )

    session.speaker_id = speaker_data.speaker_id
    db.commit()
    db.refresh(session)

    return session_to_dict(session)
