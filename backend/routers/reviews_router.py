from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_role
from backend.database import get_db
from backend.models import Review, Submission, User

router = APIRouter(prefix="/reviews", tags=["Reviews"])


class AssignReviewerSchema(BaseModel):
    submission_id: int
    reviewer_id: int


class SubmitReviewSchema(BaseModel):
    submission_id: int
    #score: int = Field(ge=0, le=100)
    score: int = Field(..., ge=1, le=10, description="Score must be between 1 and 10")
    recommendation: str
    comments: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    submission_id: int
    reviewer_id: int
    status: str
    # score: Optional[int] 
    # recommendation: Optional[str]
    # comments: Optional[str]
    score: Optional[int] = None
    recommendation: Optional[str] = None
    comments: Optional[str] = None
    
    # Joined Paper Details (Fix for C-07)
    title: Optional[str] = None
    abstract: Optional[str] = None
    keywords: Optional[str] = None
    file_url: Optional[str] = None

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
        #raise HTTPException(404, "Submission not found")
        raise HTTPException(status_code=404, detail="Submission not found")

    reviewer = (
        db.query(User)
        .filter(User.id == payload.reviewer_id, User.role == "reviewer")
        .first()
    )
    if not reviewer:
        # raise HTTPException(404, "Reviewer not found")
        raise HTTPException(status_code=404, detail="Reviewer not found")

    # Fix for H-07: Check for duplicate assignment
    existing_review = (
        db.query(Review)
        .filter(
            Review.submission_id == payload.submission_id,
            Review.reviewer_id == payload.reviewer_id,
        )
        .first()
    )
    if existing_review:
        raise HTTPException(
            status_code=400, 
            detail="This reviewer is already assigned to this submission"
        )

    review = Review(
        submission_id=payload.submission_id,
        reviewer_id=payload.reviewer_id,
        status="assigned",
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    
    # Attach joined paper fields to output payload
    review.title = submission.title
    review.abstract = submission.abstract
    review.keywords = getattr(submission, "keywords", None)
    review.file_url = getattr(submission, "file_url", None)
    
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
        # raise HTTPException(404, "Review assignment not found")
        raise HTTPException(status_code=404, detail="Review assignment not found")

# Check if the paper submission decision has already been finalized
    submission = db.query(Submission).filter(Submission.id == payload.submission_id).first()
    if submission and submission.status in ["accepted", "rejected", "final_accepted"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot update review. The paper decision has already been finalized."
        )

    # Fix for H-08: Mandatory comments when recommendation is 'Reject'
    clean_recommendation = payload.recommendation.strip()
    if clean_recommendation.lower() == "reject" and (not payload.comments or len(payload.comments.strip()) < 10):
        raise HTTPException(
            status_code=400,
            detail="Detailed feedback comments (at least 10 characters) are required for a Reject recommendation"
        )

    review.score = payload.score
    review.recommendation = payload.recommendation.strip()
    review.comments = payload.comments
    review.status = "completed"
    review.submitted_at = datetime.utcnow()

    db.commit()
    db.refresh(review)
    
    submission = db.query(Submission).filter(Submission.id == review.submission_id).first()
    if submission:
        review.title = submission.title
        review.abstract = submission.abstract
        review.keywords = getattr(submission, "keywords", None)
        review.file_url = getattr(submission, "file_url", None)
    
    return review


@router.get("/mine", response_model=List[ReviewOut])
def list_my_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reviewer")),
):
    # return (
    #     db.query(Review)
    #     .filter(Review.reviewer_id == current_user.id)
    #     .order_by(Review.id)
    #     .all()
    # )
    
    reviews = (
        db.query(Review)
        .filter(Review.reviewer_id == current_user.id)
        .order_by(Review.id)
        .all()
    )

    out = []
    for r in reviews:
        submission = db.query(Submission).filter(Submission.id == r.submission_id).first()
        r.title = submission.title if submission else None
        r.abstract = submission.abstract if submission else None
        r.keywords = getattr(submission, "keywords", None) if submission else None
        r.file_url = getattr(submission, "file_url", None) if submission else None
        out.append(r)

    return out


@router.get("/", response_model=List[ReviewOut])
def list_reviews_for_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    #current_user=Depends(require_role("organizer")),
    current_user: User = Depends(get_current_user), # Allow authenticated users
):
    # if not db.query(Submission).filter(Submission.id == submission_id).first():
    #     #raise HTTPException(404, "Submission not found")
    #     raise HTTPException(status_code=404, detail="Submission not found")
    # # return (
    # #     db.query(Review)
    # #     .filter(Review.submission_id == submission_id)
    # #     .all()
    # # )
    
    # 1. Fetch submission first so 'submission' is defined
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # 2.Authorize: Only Organizers OR the Submission's Author can view reviews
    if current_user.role != "organizer" and submission.author_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view reviews for this submission",
        )
    
    reviews = (
        db.query(Review)
        .filter(Review.submission_id == submission_id)
        .all()
    )

    for r in reviews:
        r.title = submission.title 
        r.abstract = submission.abstract 
        r.keywords = getattr(submission, "keywords", None) 
        r.file_url = getattr(submission, "file_url", None) 

    return reviews
