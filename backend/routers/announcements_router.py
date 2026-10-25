from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_role
from backend.database import get_db
from backend.models import Announcement, Conference, User

MOCK_CONFERENCE_ID = 1

router = APIRouter(prefix="/announcements", tags=["Announcements"])


class AnnouncementCreate(BaseModel):
    conference_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)
    audience: str = Field(default="all", max_length=100)
    scheduled_for: Optional[datetime] = None
    delivery_channel: str = Field(default="in-app", max_length=50)

    @field_validator("title", "message", "audience", "delivery_channel")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


class AnnouncementOut(BaseModel):
    id: int
    conference_id: int
    title: str
    message: str
    audience: str
    scheduled_for: Optional[datetime] = None
    delivery_channel: str
    created_by: int

    class Config:
        from_attributes = True


@router.post(
    "/",
    response_model=AnnouncementOut,
    status_code=status.HTTP_201_CREATED,
)
def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    if not db.query(Conference).filter(Conference.id == payload.conference_id).first():
        raise HTTPException(404, "Conference not found")

    announcement = Announcement(
        conference_id=payload.conference_id,
        title=payload.title.strip(),
        message=payload.message.strip(),
        audience=payload.audience,
        scheduled_for=payload.scheduled_for,
        delivery_channel=payload.delivery_channel,
        created_by=current_user.id,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


@router.get("/", response_model=List[AnnouncementOut])
def get_announcements(
    conference_id: int = MOCK_CONFERENCE_ID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Conference).filter(Conference.id == conference_id).first():
        raise HTTPException(404, "Conference not found")
    return (
        db.query(Announcement)
        .filter(Announcement.conference_id == conference_id)
        .order_by(Announcement.created_at.desc())
        .all()
    )
