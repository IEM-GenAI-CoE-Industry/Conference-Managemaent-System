from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from backend.auth import require_role
from backend.database import get_db
from backend import models

router = APIRouter(prefix="/conferences", tags=["Conferences"])

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

def conference_to_response(c):
    return {"id": c.id, "name": c.name, "description": c.description, "start_date": c.start_date, "end_date": c.end_date, "location": c.location, "organizer_id": c.organizer_id}

def session_to_response(s):
    return {"id": s.id, "conference_id": s.conference_id, "title": s.title, "speaker_id": s.speaker_id, "speaker_confirmed": s.speaker_confirmed, "start_time": s.start_time, "end_time": s.end_time, "location": s.location, "room_capacity": s.room_capacity, "expected_attendees": s.expected_attendees}

@router.post("/", response_model=ConferenceResponse, status_code=201)
def create_conference(payload: ConferenceCreate, db: Session = Depends(get_db), current_user=Depends(require_role("organizer"))):
    if payload.end_date < payload.start_date: raise HTTPException(400, "Conference end date cannot be before start date")
    conference = models.Conference(title=payload.name.strip(), description=payload.description, start_date=payload.start_date.isoformat(), end_date=payload.end_date.isoformat(), location=payload.location.strip(), organizer_id=current_user.id)
    db.add(conference); db.commit(); db.refresh(conference)
    return conference_to_response(conference)

@router.get("/", response_model=List[ConferenceResponse])
def list_conferences(db: Session = Depends(get_db)):
    return [conference_to_response(c) for c in db.query(models.Conference).order_by(models.Conference.start_date).all()]

@router.get("/{conference_id}", response_model=ConferenceResponse)
def get_conference(conference_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Conference).filter(models.Conference.id == conference_id).first()
    if not c: raise HTTPException(404, "Conference not found")
    return conference_to_response(c)

@router.get("/{conference_id}/agenda")
def agenda(conference_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Conference).filter(models.Conference.id == conference_id).first()
    if not c: raise HTTPException(404, "Conference not found")
    sessions = db.query(models.Session).filter(models.Session.conference_id == conference_id).order_by(models.Session.start_time).all()
    return {"conference": conference_to_response(c), "sessions": [session_to_response(s) for s in sessions]}
