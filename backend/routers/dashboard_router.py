from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from auth import get_current_user
from models import User, Conference
from routers.feedback_router import Feedback

router = APIRouter()

# ============================================================
# GET /dashboard/stats
# ============================================================

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # --- Users ---
    total_users = db.query(func.count(User.id)).scalar()

    # --- Conferences ---
    total_conferences = db.query(func.count(Conference.id)).scalar()

    # --- Feedback & Satisfaction ---
    total_feedback = db.query(func.count(Feedback.id)).scalar()
    satisfaction_avg = db.query(func.avg(Feedback.rating)).scalar()

    # --- Placeholders for other modules ---
    # These will return real numbers once teammates
    # push their models (sessions, registrations, etc.)
    stats = {
        "total_users": total_users,
        "total_conferences": total_conferences,
        "total_sessions": "pending - Member B",
        "total_registrations": "pending - Member C",
        "total_revenue": "pending - Member C",
        "total_submissions": "pending - Member D",
        "submissions_accepted": "pending - Member D",
        "submissions_rejected": "pending - Member D",
        "total_certificates": "pending - Member D",
        "total_feedback": total_feedback,
        "satisfaction_avg": round(satisfaction_avg, 2) if satisfaction_avg else None,
    }

    return stats