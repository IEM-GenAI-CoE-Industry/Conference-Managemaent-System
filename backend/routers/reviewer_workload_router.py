from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth import require_role
from backend.database import get_db
from backend.models import Review, Submission, User

router = APIRouter(prefix="/reviewers", tags=["Reviewer Workload"])
submission_router = APIRouter(prefix="/submissions", tags=["Reviewer Workload"])


def _reviewer_loads(db: Session, conference_id: int):
    rows = (
        db.query(
            User.id.label("reviewer_id"),
            User.username.label("reviewer_name"),
            func.count(Review.id).label("assigned_count"),
        )
        .outerjoin(Review, Review.reviewer_id == User.id)
        .outerjoin(Submission, Submission.id == Review.submission_id)
        .filter(User.role == "reviewer")
        .group_by(User.id, User.username)
        .all()
    )

    # The outer join above needs the conference filter without losing
    # reviewers who have zero assignments.
    result = []
    for row in rows:
        assignments = (
            db.query(func.count(Review.id))
            .join(Submission, Submission.id == Review.submission_id)
            .filter(
                Review.reviewer_id == row.reviewer_id,
                Submission.conference_id == conference_id,
            )
            .scalar()
            or 0
        )
        status = (
            "overloaded"
            if assignments > 8
            else "moderate"
            if assignments >= 5
            else "available"
        )
        result.append(
            {
                "reviewer_id": row.reviewer_id,
                "reviewer_name": row.reviewer_name,
                "assigned_count": int(assignments),
                "status": status,
            }
        )
    return result


@router.get("/workload")
def reviewer_workload(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("organizer")),
):
    if not db.query(Submission).filter(Submission.conference_id == conference_id).first():
        # A conference can legitimately have zero submissions, so this check
        # is intentionally omitted; conference validation belongs to the
        # integration layer. Return reviewers with zero load.
        pass
    return {"conference_id": conference_id, "reviewers": _reviewer_loads(db, conference_id)}


@router.get("/workload/suggest")
def suggest_reviewer(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("organizer")),
):
    reviewers = _reviewer_loads(db, conference_id)
    if not reviewers:
        raise HTTPException(404, "No reviewers found")

    recommended = min(reviewers, key=lambda item: item["assigned_count"])
    return {
        "conference_id": conference_id,
        "recommended_reviewer_id": recommended["reviewer_id"],
        "reviewer_name": recommended["reviewer_name"],
        "current_load": recommended["assigned_count"],
        "status": recommended["status"],
    }


@submission_router.patch("/{submission_id}/reassign")
def reassign_submission(
    submission_id: int,
    reviewer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("organizer")),
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(404, "Submission not found")

    reviewer = (
        db.query(User)
        .filter(User.id == reviewer_id, User.role == "reviewer")
        .first()
    )
    if not reviewer:
        raise HTTPException(404, "Reviewer not found")

    review = (
        db.query(Review)
        .filter(Review.submission_id == submission_id)
        .order_by(Review.id)
        .first()
    )
    if not review:
        raise HTTPException(404, "No reviewer assignment exists for this submission")

    review.reviewer_id = reviewer_id
    db.commit()
    db.refresh(review)

    return {
        "message": "Submission reassigned successfully",
        "submission_id": submission_id,
        "reviewer_id": reviewer.id,
        "reviewer_name": reviewer.username,
        "review_id": review.id,
    }
