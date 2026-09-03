from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.auth import get_current_user
from backend.models import User, Conference, Feedback, Review, Submission

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    total_users = db.query(func.count(User.id)).scalar()

    total_conferences = db.query(func.count(Conference.id)).scalar()

    total_feedback = db.query(func.count(Feedback.id)).scalar()

    satisfaction_avg = db.query(func.avg(Feedback.rating)).scalar()

    # Reviewer workload for the selected conference
    workload_data = db.query(
        Review.reviewer_id,
        func.count(Review.id).label("cnt"),
    ).join(
        Submission,
        Review.submission_id == Submission.id
    ).filter(
        Submission.conference_id == conference_id
    ).group_by(
        Review.reviewer_id
    ).all()

    overloaded = sum(1 for r in workload_data if r.cnt > 8)
    moderate = sum(1 for r in workload_data if 5 <= r.cnt <= 8)
    available = sum(1 for r in workload_data if r.cnt < 5)

    return {
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
        "satisfaction_avg": (
            round(satisfaction_avg, 2)
            if satisfaction_avg
            else None
        ),
        "reviewer_workload_summary": {
            "overloaded": overloaded,
            "moderate": moderate,
            "available": available,
        },
    }