from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Announcement

MOCK_CONFERENCE_ID = 1
MOCK_USER_ID = 1

router = APIRouter(prefix="/announcements", tags=["Announcements"])

class AnnouncementCreate(BaseModel):
    conference_id: int = MOCK_CONFERENCE_ID
    title: str
    message: str
    start_time: str = None  # Optional, can be added later
    end_time:str = None  # Optional, can be added later
    speaker: str = None  # Optional, can be added later
    

class AnnouncementOut(BaseModel):
    id: int
    conference_id: int
    title: str
    message: str
    
    created_by: int

    class Config:
        from_attributes = True

@router.post("/", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
def create_announcement(payload: AnnouncementCreate, db: Session = Depends(get_db)):
    ann = Announcement(
        conference_id=payload.conference_id,
        title=payload.title,
        message=payload.message,
        
        created_by=MOCK_USER_ID
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return ann

@router.get("/", response_model=List[AnnouncementOut])
def get_announcements(conference_id: int = MOCK_CONFERENCE_ID, db: Session = Depends(get_db)):
    return db.query(Announcement).filter(Announcement.conference_id == conference_id).all()