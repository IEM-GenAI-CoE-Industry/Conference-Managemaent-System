from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_role
from backend.database import get_db
from backend.models import Attendance, Conference, Registration, Session as SessionModel, User

router = APIRouter(prefix="/attendance", tags=["Attendance"])


class AttendanceMark(BaseModel):
    user_id: int
    session_id: int
    attended: bool = True


class SelfCheckIn(BaseModel):
    code: str


@router.get("/options")
def attendance_options(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = db.query(SessionModel).order_by(SessionModel.start_time).all()
    if current_user.role != "organizer":
        registered_conferences = [row[0] for row in db.query(Registration.conference_id).filter(Registration.user_id == current_user.id).all()]
        sessions = [session for session in sessions if session.conference_id in registered_conferences]
    data = {"sessions": [{"id": s.id, "title": s.title, "start_time": s.start_time, "location": s.location, "check_in_code": f"CMS-{s.id:04d}" if current_user.role == "organizer" else None} for s in sessions]}
    if current_user.role == "organizer":
        data["attendees"] = [{"id": u.id, "name": u.username, "email": u.email, "role": u.role} for u in db.query(User).filter(User.role.in_(["participant", "author", "speaker", "reviewer"])).order_by(User.username).all()]
    return data


@router.post("/check-in", status_code=status.HTTP_201_CREATED)
def self_check_in(payload: SelfCheckIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    code = payload.code.strip().upper()
    if not code.startswith("CMS-") or not code[4:].isdigit():
        raise HTTPException(422, "Enter the check-in code displayed by the organizer")
    session = db.query(SessionModel).filter(SessionModel.id == int(code[4:])).first()
    if not session:
        raise HTTPException(404, "This check-in code is not valid")
    registered = db.query(Registration).filter(Registration.user_id == current_user.id, Registration.conference_id == session.conference_id).first()
    if not registered:
        raise HTTPException(403, "You must be registered for this conference before checking in")
    record = db.query(Attendance).filter(Attendance.user_id == current_user.id, Attendance.session_id == session.id).first()
    if not record:
        record = Attendance(user_id=current_user.id, session_id=session.id, attended=True)
        db.add(record)
    else:
        record.attended = True
    db.commit()
    db.refresh(record)
    return record


@router.post("/mark", status_code=status.HTTP_201_CREATED)
def mark_attendance(
    payload: AttendanceMark,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    if payload.session_id <= 0 or payload.user_id <= 0:
        raise HTTPException(400, "Session ID and user ID must be positive integers")

    session = db.query(SessionModel).filter(SessionModel.id == payload.session_id).first()
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    if not user:
        raise HTTPException(404, "User not found")

    session_conference = db.query(Conference).filter(Conference.id == session.conference_id).first()
    if session_conference is None:
        raise HTTPException(404, "Session conference not found")

    record = (
        db.query(Attendance)
        .filter(
            Attendance.user_id == payload.user_id,
            Attendance.session_id == payload.session_id,
        )
        .first()
    )
    if record:
        record.attended = payload.attended
        record.user_id = payload.user_id
    else:
        record = Attendance(
            user_id=payload.user_id,
            session_id=payload.session_id,
            attended=payload.attended,
        )
        db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/")
def get_attendance(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if session_id <= 0:
        raise HTTPException(400, "Session ID must be a positive integer")

    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")

    query = db.query(Attendance).filter(Attendance.session_id == session_id)
    if current_user.role != "organizer":
        query = query.filter(Attendance.user_id == current_user.id)
    return query.all()
