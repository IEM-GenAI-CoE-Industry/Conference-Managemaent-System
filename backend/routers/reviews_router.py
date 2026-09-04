from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.auth import require_role
from backend.database import get_db
from backend.models import Review, Submission, User

router = APIRouter(prefix="/reviews", tags=["Reviews"])


class AssignReviewerSchema(BaseModel):
    submission_id: int
    reviewer_id: int


class SubmitReviewSchema(BaseModel):
    submission_id: int
    score: int = Field(ge=0, le=100)
    recommendation: str
    comments: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    submission_id: int
    reviewer_id: int
    status: str
    score: Optional[int]
    recommendation: Optional[str]
    comments: Optional[str]

    class Config:
        from_attributes = True


@router.post(
    "/assign",
    response_model=ReviewOut,
    status_code=status.HTTP_201_CREATED,
)
def assign_reviewer(
    payload: AssignReviewerSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("organizer")),
):
    submission = (
        db.query(Submission)
        .filter(Submission.id == payload.submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(404, "Submission not found")

    reviewer = (
        db.query(User)
        .filter(User.id == payload.reviewer_id, User.role == "reviewer")
        .first()
    )
    if not reviewer:
        raise HTTPException(404, "Reviewer not found")

    review = Review(
        submission_id=payload.submission_id,
        reviewer_id=payload.reviewer_id,
        status="assigned",
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.post("/submit", response_model=ReviewOut)
def submit_review(
    payload: SubmitReviewSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("reviewer")),
):
    review = (
        db.query(Review)
        .filter(
            Review.submission_id == payload.submission_id,
            Review.reviewer_id == current_user.id,
        )
        .order_by(Review.id)
        .first()
    )
    if not review:
        raise HTTPException(404, "Review assignment not found")

    review.score = payload.score
    review.recommendation = payload.recommendation.strip()
    review.comments = payload.comments
    review.status = "completed"
    review.submitted_at = datetime.utcnow()

    db.commit()
    db.refresh(review)
    return review


@router.get("/", response_model=List[ReviewOut])
def list_reviews_for_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("organizer")),
):
    if not db.query(Submission).filter(Submission.id == submission_id).first():
        raise HTTPException(404, "Submission not found")
    return (
        db.query(Review)
        .filter(Review.submission_id == submission_id)
        .all()
    )
