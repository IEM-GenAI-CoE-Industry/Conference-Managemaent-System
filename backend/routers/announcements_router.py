import html
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_role
from backend.database import get_db
from backend.models import Announcement, Conference, User

MOCK_CONFERENCE_ID = 1

router = APIRouter(prefix="/announcements", tags=["Announcements"])


class AnnouncementCreate(BaseModel):
    conference_id: int = MOCK_CONFERENCE_ID
    title: str
    message: str
    
    target_audience: Optional[str] = "all"

    @validator("title", "message")
    def validate_non_empty(cls, v: str):
        if not v or not v.strip():
            raise ValueError("Field cannot be empty or contain only whitespace.")
        #return v.strip()
        # Fix for M-43: Escape HTML entities to prevent script/HTML injection
        return html.escape(v.strip())

    @validator("target_audience")
    def validate_audience(cls, v: Optional[str]):
        if not v:
            return "all"
        clean = v.strip().lower()
        allowed = {"all", "authors", "reviewers", "attendees", "organizers"}
        if clean not in allowed:
            raise ValueError(f"Target audience must be one of: {', '.join(allowed)}")
        return clean


class AnnouncementOut(BaseModel):
    id: int
    conference_id: int
    title: str
    message: str
    created_by: int
    target_audience: str
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
        
        target_audience=payload.target_audience, #ADDED TARGET AUDIENCE
        
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
    # return (
    #     db.query(Announcement)
    #     .filter(Announcement.conference_id == conference_id)
    #     .order_by(Announcement.created_at.desc())
    #     .all()
    # )
    
    query = db.query(Announcement).filter(Announcement.conference_id == conference_id)

    # Fix for M-31: Filter announcements by target audience according to user role
    if current_user.role != "organizer":
        query = query.filter(
            (Announcement.target_audience == "all") | 
            (Announcement.target_audience == current_user.role)
        )

    return (
        query.order_by(Announcement.created_at.desc())
        .all()
    )
