from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.auth import require_role
from backend.database import get_db
from backend.models import ConflictOfInterest, Review, Submission, User

router = APIRouter(prefix="/reviews", tags=["Reviews"])


class AssignReviewerSchema(BaseModel):
    submission_id: int
    reviewer_id: int
    deadline: Optional[datetime] = None


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
    deadline: Optional[datetime] = None
    score: Optional[int]
    recommendation: Optional[str]
    comments: Optional[str]
    title: Optional[str] = None
    abstract: Optional[str] = None

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

    conflict = (
        db.query(ConflictOfInterest)
        .filter(
            ConflictOfInterest.submission_id == payload.submission_id,
            ConflictOfInterest.reviewer_id == payload.reviewer_id,
        )
        .first()
    )

    if conflict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign reviewer: a conflict of interest has been declared.",
        )

    review = Review(
        submission_id=payload.submission_id,
        reviewer_id=payload.reviewer_id,
        status="assigned",
        deadline=payload.deadline,
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



@router.get("/mine", response_model=List[ReviewOut])
def list_my_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reviewer")),
):
    reviews = (
        db.query(Review, Submission)
        .join(Submission, Review.submission_id == Submission.id)
        .filter(Review.reviewer_id == current_user.id)
        .order_by(Review.id)
        .all()
    )

    result = []

    for review, submission in reviews:
        result.append(
            ReviewOut(
                id=review.id,
                submission_id=review.submission_id,
                reviewer_id=review.reviewer_id,
                status=review.status,
                score=review.score,
                recommendation=review.recommendation,
                comments=review.comments,
                title=submission.title,
                abstract=submission.abstract,
                deadline=review.deadline,
            )
        )

    return result



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


class COIDeclarationSchema(BaseModel):
    submission_id: int
    reason: Optional[str] = None


@router.post("/coi", status_code=status.HTTP_201_CREATED)
def declare_conflict_of_interest(
    payload: COIDeclarationSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reviewer")),
):
    submission = (
        db.query(Submission)
        .filter(Submission.id == payload.submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    existing = (
        db.query(ConflictOfInterest)
        .filter(
            ConflictOfInterest.submission_id == payload.submission_id,
            ConflictOfInterest.reviewer_id == current_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already declared a conflict for this submission.",
        )

    conflict = ConflictOfInterest(
        submission_id=payload.submission_id,
        reviewer_id=current_user.id,
        reason=payload.reason,
    )
    db.add(conflict)
    db.commit()
    db.refresh(conflict)

    return {
        "message": "Conflict of interest declared successfully",
        "submission_id": conflict.submission_id,
    }
