from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from models import Review, Submission

router = APIRouter(prefix="/reviews", tags=["Reviews"])

class AssignReviewerSchema(BaseModel):
    submission_id: int
    reviewer_id: int

class SubmitReviewSchema(BaseModel):
    submission_id: int
    score: int
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

@router.post("/assign", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def assign_reviewer(payload: AssignReviewerSchema, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == payload.submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    review = Review(
        submission_id=payload.submission_id,
        reviewer_id=payload.reviewer_id,
        status="assigned"
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review

@router.post("/submit", response_model=ReviewOut)
def submit_review(payload: SubmitReviewSchema, db: Session = Depends(get_db)):
    review = db.query(Review).filter(
        Review.submission_id == payload.submission_id
    ).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review assignment not found")
    
    review.score = payload.score
    review.recommendation = payload.recommendation
    review.comments = payload.comments
    review.status = "completed"
    review.submitted_at = datetime.utcnow()
    
    db.commit()
    db.refresh(review)
    return review

@router.get("/", response_model=List[ReviewOut])
def list_reviews_for_submission(submission_id: int, db: Session = Depends(get_db)):
    return db.query(Review).filter(Review.submission_id == submission_id).all()