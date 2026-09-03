"""
dev_router.py - TEMPORARY, local testing only.

Lets you create fake users (author/reviewer/organizer) without waiting for
Member A's real registration/login endpoints. Delete this whole file once
real auth is merged in.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import User, Conference, Session as SessionModel, Speaker

router = APIRouter(prefix="/dev", tags=["DEV ONLY - delete before merge"])


class UserCreate(BaseModel):
    name: str
    email: str
    role: str = "participant"  # participant | author | reviewer | organizer


@router.post("/users")
def create_test_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already used")

    user = User(name=payload.name, email=payload.email, role=payload.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users")
def list_test_users(db: Session = Depends(get_db)):
    return db.query(User).all()


# ---------------------------------------------------------------------------
# Seed helpers for search_router.py testing - these mimic what Member B's
# real conference/session/speaker endpoints will eventually create.
# ---------------------------------------------------------------------------
class ConferenceCreate(BaseModel):
    name: str
    description: str = ""


class SessionCreate(BaseModel):
    conference_id: int
    title: str
    description: str = ""


class SpeakerCreate(BaseModel):
    name: str
    bio: str = ""


@router.post("/conferences")
def seed_conference(payload: ConferenceCreate, db: Session = Depends(get_db)):
    c = Conference(name=payload.name, description=payload.description)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.post("/sessions")
def seed_session(payload: SessionCreate, db: Session = Depends(get_db)):
    s = SessionModel(conference_id=payload.conference_id, title=payload.title, description=payload.description)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.post("/speakers")
def seed_speaker(payload: SpeakerCreate, db: Session = Depends(get_db)):
    sp = Speaker(name=payload.name, bio=payload.bio)
    db.add(sp)
    db.commit()
    db.refresh(sp)
    return sp