from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.auth import get_current_user
from backend.database import get_db
from backend.models import Attendance, Conference, Feedback, Payment, Registration, Session as SessionModel, User

router = APIRouter()

def workload_summary(db: Session, conference_id: int):
    # Swapna's review tables are intentionally not required for this prototype.
    return {"overloaded": 0, "moderate": 0, "available": 0, "note": "Reviewer workload activates when the review module is merged."}

@router.get("/stats")
def get_dashboard_stats(conference_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.query(Conference).filter(Conference.id == conference_id).first():
        raise HTTPException(404, "Conference not found")
    registrations = db.query(func.count(Registration.id)).filter(Registration.conference_id == conference_id).scalar() or 0
    revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).join(Registration).filter(Registration.conference_id == conference_id, Payment.status == "paid").scalar() or 0
    total_feedback = db.query(func.count(Feedback.id)).filter(Feedback.conference_id == conference_id).scalar() or 0
    satisfaction = db.query(func.avg(Feedback.rating)).filter(Feedback.conference_id == conference_id).scalar()
    total_sessions = db.query(func.count(SessionModel.id)).filter(SessionModel.conference_id == conference_id).scalar() or 0
    attendance = db.query(func.count(Attendance.id)).join(SessionModel).filter(SessionModel.conference_id == conference_id, Attendance.attended.is_(True)).scalar() or 0
    return {
        "conference_id": conference_id,
        "total_users": db.query(func.count(User.id)).scalar() or 0,
        "total_conferences": db.query(func.count(Conference.id)).scalar() or 0,
        "total_sessions": total_sessions,
        "total_registrations": registrations,
        "total_revenue": round(float(revenue), 2),
        "total_submissions": 0,
        "submissions_accepted": 0,
        "submissions_rejected": 0,
        "total_certificates": 0,
        "total_attendance_records": attendance,
        "total_feedback": total_feedback,
        "satisfaction_avg": round(float(satisfaction), 2) if satisfaction is not None else None,
        "reviewer_workload_summary": workload_summary(db, conference_id),
        "swapna_module_status": "pending integration",
    }
