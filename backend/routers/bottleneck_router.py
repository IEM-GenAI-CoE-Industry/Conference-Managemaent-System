from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth import require_role
from backend.database import get_db
from backend.models import (
    Conference,
    Payment,
    Registration,
    Review,
    Session as SessionModel,
    Submission,
)

router = APIRouter(prefix="/bottlenecks", tags=["Bottlenecks"])


def build_alerts(conference_id: int, db: Session):
    if not db.query(Conference).filter(Conference.id == conference_id).first():
        raise HTTPException(404, "Conference not found")

    alerts = []
    sessions = (
        db.query(SessionModel)
        .filter(SessionModel.conference_id == conference_id)
        .all()
    )

    # Papers with no reviewer assignment.
    unassigned = (
        db.query(func.count(Submission.id))
        .outerjoin(Review, Review.submission_id == Submission.id)
        .filter(
            Submission.conference_id == conference_id,
            Review.id.is_(None),
        )
        .scalar()
        or 0
    )
    if unassigned:
        severity = "critical" if unassigned > 10 else "warning"
        alerts.append(
            {
                "severity": severity,
                "category": "reviews",
                "message": f"{unassigned} papers are still unassigned to reviewers",
                "count": int(unassigned),
            }
        )

    overdue = (
        db.query(Payment)
        .join(Registration, Payment.registration_id == Registration.id)
        .filter(
            Registration.conference_id == conference_id,
            Payment.status == "pending",
            Payment.created_at
            < datetime.utcnow() - timedelta(hours=48),
        )
        .count()
    )
    if overdue:
        alerts.append(
            {
                "severity": "warning",
                "category": "payments",
                "message": f"{overdue} payments are pending for more than 48 hours",
                "count": overdue,
            }
        )

    unconfirmed = sum(
        1
        for session in sessions
        if session.speaker_id and not session.speaker_confirmed
    )
    if unconfirmed:
        alerts.append(
            {
                "severity": "warning",
                "category": "speakers",
                "message": f"{unconfirmed} session speaker confirmations are pending",
                "count": unconfirmed,
            }
        )

    overcrowded = [
        session
        for session in sessions
        if session.expected_attendees is not None
        and session.expected_attendees > session.room_capacity
    ]
    if overcrowded:
        alerts.append(
            {
                "severity": "critical",
                "category": "capacity",
                "message": f"{len(overcrowded)} sessions exceed room capacity",
                "count": len(overcrowded),
            }
        )

    now = datetime.utcnow()
    approaching = []
    for session in sessions:
        attendance_count = len(session.attendance_records)
        seconds_until_start = (session.start_time - now).total_seconds()
        if 0 <= seconds_until_start <= 24 * 3600 and attendance_count == 0:
            approaching.append(session)

    if approaching:
        alerts.append(
            {
                "severity": "info",
                "category": "attendance",
                "message": (
                    f"{len(approaching)} sessions are approaching "
                    "with no registered attendees"
                ),
                "count": len(approaching),
            }
        )

    return sorted(
        alerts,
        key=lambda item: {"critical": 0, "warning": 1, "info": 2}[item["severity"]],
    )


@router.get("")
@router.get("/")
def get_bottlenecks(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("organizer")),
):
    return build_alerts(conference_id, db)


@router.get("/summary")
def bottleneck_summary(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("organizer")),
):
    alerts = build_alerts(conference_id, db)
    summary = {"critical": 0, "warning": 0, "info": 0}
    for alert in alerts:
        summary[alert["severity"]] += 1
    summary["total"] = len(alerts)
    return summary
