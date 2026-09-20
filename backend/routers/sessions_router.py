from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.auth import require_role
from backend.database import get_db
from backend import models

router = APIRouter(prefix="/sessions", tags=["Sessions"])
rooms_router = APIRouter(prefix="/rooms", tags=["Rooms"])

class SessionCreate(BaseModel):
    conference_id: int
    title: str
    speaker_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    location: str
    room_capacity: int = Field(gt=0)
    expected_attendees: Optional[int] = Field(default=None, ge=0)

class SpeakerAssign(BaseModel): speaker_id: int
class SpeakerConfirmation(BaseModel): confirmed: bool
class RoomUpdate(BaseModel):
    location: str
    room_capacity: int = Field(gt=0)

def out(s):
    return {"id": s.id, "conference_id": s.conference_id, "title": s.title, "speaker_id": s.speaker_id, "speaker_confirmed": s.speaker_confirmed, "start_time": s.start_time, "end_time": s.end_time, "location": s.location, "room_capacity": s.room_capacity, "expected_attendees": s.expected_attendees}

@router.post("/", status_code=201)
def create_session(payload: SessionCreate, db: Session = Depends(get_db), current_user=Depends(require_role("organizer"))):
    if not db.query(models.Conference).filter(models.Conference.id == payload.conference_id).first(): raise HTTPException(404, "Conference not found")
    if payload.end_time <= payload.start_time: raise HTTPException(400, "Session end time must be after start time")
    if payload.speaker_id:
        speaker = db.query(models.User).filter(models.User.id == payload.speaker_id, models.User.role == "speaker").first()
        if not speaker: raise HTTPException(400, "Selected user does not have the speaker role")
    s = models.Session(conference_id=payload.conference_id, title=payload.title.strip(), speaker_id=payload.speaker_id, start_time=payload.start_time, end_time=payload.end_time, location=payload.location.strip(), room_capacity=payload.room_capacity, expected_attendees=payload.expected_attendees)
    db.add(s); db.commit(); db.refresh(s); return out(s)

@router.post("/{session_id}/assign-speaker")
def assign_speaker(session_id: int, payload: SpeakerAssign, db: Session = Depends(get_db), current_user=Depends(require_role("organizer"))):
    s = db.query(models.Session).filter(models.Session.id == session_id).first()
    speaker = db.query(models.User).filter(models.User.id == payload.speaker_id, models.User.role == "speaker").first()
    if not s: raise HTTPException(404, "Session not found")
    if not speaker: raise HTTPException(404, "Speaker not found")
    s.speaker_id = speaker.id; s.speaker_confirmed = False; db.commit(); db.refresh(s); return out(s)

@router.post("/{session_id}/confirm-speaker")
def confirm_speaker(session_id: int, payload: SpeakerConfirmation, db: Session = Depends(get_db), current_user=Depends(require_role("organizer"))):
    s = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not s: raise HTTPException(404, "Session not found")
    s.speaker_confirmed = payload.confirmed; db.commit(); db.refresh(s); return out(s)

@rooms_router.get("/utilization")
def utilization(conference_id: int, db: Session = Depends(get_db)):
    if not db.query(models.Conference).filter(models.Conference.id == conference_id).first(): raise HTTPException(404, "Conference not found")
    sessions = db.query(models.Session).filter(models.Session.conference_id == conference_id).all()
    data=[]
    for s in sessions:
        expected=s.expected_attendees or 0; pct=(expected/s.room_capacity*100) if s.room_capacity else 0
        status="overcrowded" if pct>90 else "efficient" if pct>=60 else "underutilized"
        data.append({"session_id":s.id,"session_title":s.title,"room":s.location,"room_capacity":s.room_capacity,"expected_attendees":expected,"utilization_pct":round(pct,2),"status":status})
    avg=round(sum(x["utilization_pct"] for x in data)/len(data),2) if data else 0
    return {"total_sessions":len(data),"average_utilization":avg,"sessions":data}

@rooms_router.get("/suggestions")
def suggestions(conference_id: int, db: Session = Depends(get_db)):
    sessions=db.query(models.Session).filter(models.Session.conference_id==conference_id).all()
    over=[s for s in sessions if s.expected_attendees and s.expected_attendees>s.room_capacity]
    under=[s for s in sessions if s.expected_attendees is not None and s.expected_attendees/s.room_capacity<0.60]
    result=[]
    for a in over:
        for b in under:
            if b.room_capacity>=a.expected_attendees:
                result.append({"session_a_id":a.id,"session_b_id":b.id,"reason":f"Session '{a.title}' is overcrowded while '{b.title}' is underutilized, and room B has enough capacity.","suggested_swap":f"Move session {a.id} to room {b.location}"})
    return result

@router.patch("/{session_id}/room")
def update_room(session_id:int,payload:RoomUpdate,db:Session=Depends(get_db),current_user=Depends(require_role("organizer"))):
    s=db.query(models.Session).filter(models.Session.id==session_id).first()
    if not s: raise HTTPException(404,"Session not found")
    s.location=payload.location.strip(); s.room_capacity=payload.room_capacity; db.commit(); db.refresh(s); return out(s)
