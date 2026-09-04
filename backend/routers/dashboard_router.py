from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth import require_role
from backend.database import get_db
from backend.models import (
    Attendance,
    Certificate,
    Conference,
    Feedback,
    Payment,
    Registration,
    Review,
    Session as SessionModel,
    Submission,
    User,
)

router = APIRouter()


def reviewer_workload_summary(db: Session, conference_id: int):
    rows = (
        db.query(
            User.id,
            func.count(Review.id).label("assigned_count"),
        )
        .join(Review, Review.reviewer_id == User.id)
        .join(Submission, Submission.id == Review.submission_id)
        .filter(
            User.role == "reviewer",
            Submission.conference_id == conference_id,
        )
        .group_by(User.id)
        .all()
    )

    counts = {row.id: int(row.assigned_count) for row in rows}
    reviewers = (
        db.query(User)
        .filter(User.role == "reviewer")
        .all()
    )

    summary = {"overloaded": 0, "moderate": 0, "available": 0}
    for reviewer in reviewers:
        assigned = counts.get(reviewer.id, 0)
        if assigned > 8:
            summary["overloaded"] += 1
        elif assigned >= 5:
            summary["moderate"] += 1
        else:
            summary["available"] += 1

    return summary


@router.get("/stats")
def get_dashboard_stats(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    if not db.query(Conference).filter(Conference.id == conference_id).first():
        raise HTTPException(404, "Conference not found")

    registrations = (
        db.query(func.count(Registration.id))
        .filter(Registration.conference_id == conference_id)
        .scalar()
        or 0
    )

    revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .join(Registration, Payment.registration_id == Registration.id)
        .filter(
            Registration.conference_id == conference_id,
            Payment.status == "paid",
        )
        .scalar()
        or 0
    )

    total_submissions = (
        db.query(func.count(Submission.id))
        .filter(Submission.conference_id == conference_id)
        .scalar()
        or 0
    )
    submissions_accepted = (
        db.query(func.count(Submission.id))
        .filter(
            Submission.conference_id == conference_id,
            Submission.status == "accepted",
        )
        .scalar()
        or 0
    )
    submissions_rejected = (
        db.query(func.count(Submission.id))
        .filter(
            Submission.conference_id == conference_id,
            Submission.status == "rejected",
        )
        .scalar()
        or 0
    )

    total_certificates = (
        db.query(func.count(Certificate.id))
        .filter(Certificate.conference_id == conference_id)
        .scalar()
        or 0
    )

    total_feedback = (
        db.query(func.count(Feedback.id))
        .filter(Feedback.conference_id == conference_id)
        .scalar()
        or 0
    )

    satisfaction = (
        db.query(func.avg(Feedback.rating))
        .filter(Feedback.conference_id == conference_id)
        .scalar()
    )

    total_sessions = (
        db.query(func.count(SessionModel.id))
        .filter(SessionModel.conference_id == conference_id)
        .scalar()
        or 0
    )

    attendance_records = (
        db.query(func.count(Attendance.id))
        .join(SessionModel, Attendance.session_id == SessionModel.id)
        .filter(
            SessionModel.conference_id == conference_id,
            Attendance.attended.is_(True),
        )
        .scalar()
        or 0
    )

    return {
        "conference_id": conference_id,
        "total_users": db.query(func.count(User.id)).scalar() or 0,
        "total_conferences": db.query(func.count(Conference.id)).scalar() or 0,
        "total_sessions": total_sessions,
        "total_registrations": registrations,
        "total_revenue": round(float(revenue), 2),
        "total_submissions": total_submissions,
        "submissions_accepted": submissions_accepted,
        "submissions_rejected": submissions_rejected,
        "total_certificates": total_certificates,
        "total_attendance_records": attendance_records,
        "total_feedback": total_feedback,
        "satisfaction_avg": (
            round(float(satisfaction), 2) if satisfaction is not None else None
        ),
        "reviewer_workload_summary": reviewer_workload_summary(db, conference_id),
    }
