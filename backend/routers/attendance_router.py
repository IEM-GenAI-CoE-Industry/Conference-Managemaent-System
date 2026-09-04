from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.auth import get_current_user, require_role
from backend.database import get_db
from backend.models import Attendance, Session as SessionModel, User

router = APIRouter(prefix="/attendance", tags=["Attendance"])

class AttendanceMark(BaseModel):
    user_id: int
    session_id: int
    attended: bool = True

@router.post("/mark", status_code=status.HTTP_201_CREATED)
def mark_attendance(payload: AttendanceMark, db: Session = Depends(get_db), current_user: User = Depends(require_role("organizer"))):
    session = db.query(SessionModel).filter(SessionModel.id == payload.session_id).first()
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not session: raise HTTPException(404, "Session not found")
    if not user: raise HTTPException(404, "User not found")
    record = db.query(Attendance).filter(Attendance.user_id == payload.user_id, Attendance.session_id == payload.session_id).first()
    if record:
        record.attended = payload.attended
    else:
        record = Attendance(user_id=payload.user_id, session_id=payload.session_id, attended=payload.attended)
        db.add(record)
    db.commit(); db.refresh(record)
    return record

@router.get("/")
def get_attendance(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Attendance).filter(Attendance.session_id == session_id).all()
