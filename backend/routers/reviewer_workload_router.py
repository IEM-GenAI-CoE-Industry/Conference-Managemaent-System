from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.auth import require_role

router = APIRouter()

@router.get("/workload")
def reviewer_workload(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("organizer")),
):
    from backend.models import Review, Submission, User

    results = db.query(
        Review.reviewer_id,
        func.count(Review.id).label("assigned_count"),
    ).join(
        Submission,
        Review.submission_id == Submission.id
    ).filter(
        Submission.conference_id == conference_id
    ).group_by(
        Review.reviewer_id
    ).all()

    workload = []

    for row in results:
        reviewer = db.query(User).filter(
            User.id == row.reviewer_id
        ).first()

        count = row.assigned_count

        if count > 8:
            status = "overloaded"
        elif count >= 5:
            status = "moderate"
        else:
            status = "available"

        workload.append({
            "reviewer_id": row.reviewer_id,
            "reviewer_name": reviewer.name if reviewer else "Unknown",
            "assigned_count": count,
            "status": status,
        })

    return workload

@router.get("/workload/suggest")
def suggest_reviewer(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("organizer")),
):
    from backend.models import Review, Submission, User

    result = db.query(
        Review.reviewer_id,
        func.count(Review.id).label("assigned_count"),
    ).join(
        Submission,
        Review.submission_id == Submission.id
    ).filter(
        Submission.conference_id == conference_id
    ).group_by(
        Review.reviewer_id
    ).order_by(
        func.count(Review.id)
    ).first()

    if not result:
        return {"message": "No reviewers assigned yet"}

    reviewer = db.query(User).filter(
        User.id == result.reviewer_id
    ).first()

    return {
        "recommended_reviewer_id": result.reviewer_id,
        "reviewer_name": reviewer.name if reviewer else "Unknown",
        "current_load": result.assigned_count,
    }


@router.patch("/submissions/{submission_id}/reassign")
def reassign_submission(
    submission_id: int,
    reviewer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("organizer")),
):
    from fastapi import HTTPException
    from backend.models import Review, User

    review = db.query(Review).filter(
        Review.submission_id == submission_id
    ).first()

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review assignment not found"
        )

    reviewer = db.query(User).filter(
        User.id == reviewer_id
    ).first()

    if not reviewer:
        raise HTTPException(
            status_code=404,
            detail="Reviewer not found"
        )

    review.reviewer_id = reviewer_id
    db.commit()
    db.refresh(review)

    return {
        "message": "Reassigned successfully",
        "submission_id": submission_id,
        "new_reviewer_id": reviewer_id,
    }