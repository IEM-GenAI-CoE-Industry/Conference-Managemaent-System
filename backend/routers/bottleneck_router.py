from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.auth import require_role
from backend.database import get_db
from backend.models import Conference, Session as SessionModel, Payment, Registration

router = APIRouter(prefix="/bottlenecks", tags=["Bottlenecks"])

def build_alerts(conference_id: int, db: Session):
    if not db.query(Conference).filter(Conference.id == conference_id).first():
        raise HTTPException(404, "Conference not found")
    alerts = []
    sessions = db.query(SessionModel).filter(SessionModel.conference_id == conference_id).all()
    overdue = db.query(Payment).join(Registration).filter(Registration.conference_id == conference_id, Payment.status == "pending", Payment.created_at < datetime.utcnow() - timedelta(hours=48)).count()
    if overdue:
        alerts.append({"severity": "warning", "category": "payments", "message": f"{overdue} payments are pending for more than 48 hours", "count": overdue})
    unconfirmed = sum(1 for s in sessions if s.speaker_id and not s.speaker_confirmed)
    if unconfirmed:
        alerts.append({"severity": "warning", "category": "speakers", "message": f"{unconfirmed} session speaker confirmations are pending", "count": unconfirmed})
    overcrowded = [s for s in sessions if s.expected_attendees is not None and s.expected_attendees > s.room_capacity]
    if overcrowded:
        alerts.append({"severity": "critical", "category": "capacity", "message": f"{len(overcrowded)} sessions exceed room capacity", "count": len(overcrowded)})
    now = datetime.utcnow()
    approaching = []
    for s in sessions:
        attendee_count = db.query(Registration).filter(Registration.conference_id == conference_id).count() if s else 0
        session_attendance = len(s.attendance_records) if hasattr(s, "attendance_records") else 0
        if 0 <= (s.start_time - now).total_seconds() <= 24 * 3600 and session_attendance == 0:
            approaching.append(s)
    if approaching:
        alerts.append({"severity": "info", "category": "attendance", "message": f"{len(approaching)} sessions are approaching with no registered attendees", "count": len(approaching)})
    return sorted(alerts, key=lambda x: {"critical": 0, "warning": 1, "info": 2}[x["severity"]])

@router.get("")
@router.get("/")
def get_bottlenecks(conference_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("organizer"))):
    return build_alerts(conference_id, db)

@router.get("/summary")
def bottleneck_summary(conference_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("organizer"))):
    alerts = build_alerts(conference_id, db)
    summary = {"critical": 0, "warning": 0, "info": 0}
    for alert in alerts: summary[alert["severity"]] += 1
    summary["total"] = len(alerts)
    return summary
