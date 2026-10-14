from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_role
from backend.database import get_db
from backend.models import ConflictOfInterest, Notification, Review, Submission, User

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

    originality_score: int = Field(ge=1, le=5)
    methodology_score: int = Field(ge=1, le=5)
    clarity_score: int = Field(ge=1, le=5)
    significance_score: int = Field(ge=1, le=5)
    confidence_score: int = Field(ge=1, le=5)
    confidential_comments: Optional[str] = None

class SaveReviewDraftSchema(BaseModel):
    submission_id: int
    score: Optional[int] = Field(default=None, ge=0, le=100)
    recommendation: Optional[str] = None
    comments: Optional[str] = None
    originality_score: Optional[int] = Field(default=None, ge=1, le=5)
    methodology_score: Optional[int] = Field(default=None, ge=1, le=5)
    clarity_score: Optional[int] = Field(default=None, ge=1, le=5)
    significance_score: Optional[int] = Field(default=None, ge=1, le=5)
    confidence_score: Optional[int] = Field(default=None, ge=1, le=5)
    confidential_comments: Optional[str] = None

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

    originality_score: Optional[int] = None
    methodology_score: Optional[int] = None
    clarity_score: Optional[int] = None
    significance_score: Optional[int] = None
    confidence_score: Optional[int] = None


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
    notification = Notification(
    user_id=reviewer.id,
    title="New Paper Assignment",
    message=(
        f"You have been assigned to review "
        f"'{submission.title}'."
        + (
            f" Deadline: {payload.deadline.strftime('%Y-%m-%d %H:%M')}."
            if payload.deadline
            else ""
        )
    ),
    notification_type="review_assignment",
)

    db.add(review)
    db.add(notification)
    db.commit()
    db.refresh(review)

    return review

@router.post("/draft", response_model=ReviewOut)
def save_review_draft(
    payload: SaveReviewDraftSchema,
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

    if review.status == "completed":
        raise HTTPException(400, "Completed reviews cannot be saved as drafts")

    review.score = payload.score
    review.recommendation = (
        payload.recommendation.strip()
        if payload.recommendation else None
    )
    review.comments = payload.comments
    review.originality_score = payload.originality_score
    review.methodology_score = payload.methodology_score
    review.clarity_score = payload.clarity_score
    review.significance_score = payload.significance_score
    review.confidence_score = payload.confidence_score
    review.confidential_comments = payload.confidential_comments
    review.status = "draft"

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

    review.originality_score = payload.originality_score
    review.methodology_score = payload.methodology_score
    review.clarity_score = payload.clarity_score
    review.significance_score = payload.significance_score
    review.confidence_score = payload.confidence_score
    review.confidential_comments = payload.confidential_comments

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

@router.get("/confidential/{submission_id}")
def get_confidential_review_comments(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("organizer")),
):
    if not db.query(Submission).filter(
        Submission.id == submission_id
    ).first():
        raise HTTPException(404, "Submission not found")

    reviews = (
        db.query(Review)
        .filter(Review.submission_id == submission_id)
        .order_by(Review.id)
        .all()
    )

    return [
        {
            "review_id": review.id,
            "reviewer_id": review.reviewer_id,
            "confidential_comments": review.confidential_comments,
        }
        for review in reviews
    ]
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

@router.get("/notifications/mine")
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .all()
    )

    return [
        {
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "is_read": notification.is_read,
            "created_at": notification.created_at,
        }
        for notification in notifications
    ]

@router.post("/{submission_id}/withdraw")
def withdraw_review(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reviewer")),
):
    review = (
        db.query(Review)
        .filter(
            Review.submission_id == submission_id,
            Review.reviewer_id == current_user.id,
        )
        .first()
    )

    if not review:
        raise HTTPException(status_code=404, detail="Review assignment not found")

    if review.status == "completed":
        raise HTTPException(
            status_code=400,
            detail="A submitted review cannot be withdrawn here.",
        )

    review.status = "assigned"
    review.score = None
    review.recommendation = None
    review.comments = None
    review.originality_score = None
    review.methodology_score = None
    review.clarity_score = None
    review.significance_score = None
    review.confidence_score = None
    review.confidential_comments = None

    db.commit()
    return {"message": "Draft withdrawn; assignment remains available."}


@router.get("/{submission_id}/draft")
def get_review_draft(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reviewer")),
):
    review = (
        db.query(Review)
        .filter(
            Review.submission_id == submission_id,
            Review.reviewer_id == current_user.id,
        )
        .first()
    )

    if not review:
        raise HTTPException(status_code=404, detail="Review assignment not found")

    if review.status == "completed":
        raise HTTPException(status_code=400, detail="Review is already submitted")

    return {
        "submission_id": review.submission_id,
        "score": review.score,
        "recommendation": review.recommendation,
        "comments": review.comments,
        "originality_score": review.originality_score,
        "methodology_score": review.methodology_score,
        "clarity_score": review.clarity_score,
        "significance_score": review.significance_score,
        "confidence_score": review.confidence_score,
        "confidential_comments": review.confidential_comments,
        "status": review.status,
    }
