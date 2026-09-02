from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from auth import get_current_user

router = APIRouter()

MOCK_CONFERENCE_ID = 1
MOCK_SESSION_ID = 1

# ============================================================
# PYDANTIC SCHEMAS (request/response shapes)
# ============================================================

class FeedbackCreate(BaseModel):
    session_id: int
    rating: int          # 1 to 5
    comments: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: int
    session_id: int
    user_id: int
    conference_id: int
    rating: int
    comments: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# ============================================================
# DATABASE MODEL (inline - since models.py doesn't have it yet)
# ============================================================

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from database import Base

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=False)
    conference_id = Column(Integer, nullable=False)
    rating = Column(Integer, nullable=False)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ============================================================
# ENDPOINTS
# ============================================================

# POST /feedback/ — submit feedback
@router.post("/", response_model=FeedbackResponse)
def submit_feedback(
    data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not 1 <= data.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    feedback = Feedback(
        session_id=data.session_id,
        user_id=current_user.id,
        conference_id=MOCK_CONFERENCE_ID,
        rating=data.rating,
        comments=data.comments,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


# GET /feedback/ — list all feedback for a conference
@router.get("/")
def list_feedback(
    conference_id: int = MOCK_CONFERENCE_ID,
    db: Session = Depends(get_db),
):
    results = db.query(Feedback).filter(
        Feedback.conference_id == conference_id
    ).all()
    return results


# GET /feedback/summary — avg rating per session + overall avg
@router.get("/summary")
def feedback_summary(
    conference_id: int = MOCK_CONFERENCE_ID,
    db: Session = Depends(get_db),
):
    # Overall average
    overall = db.query(func.avg(Feedback.rating)).filter(
        Feedback.conference_id == conference_id
    ).scalar()

    # Per session average
    per_session = db.query(
        Feedback.session_id,
        func.avg(Feedback.rating).label("avg_rating"),
        func.count(Feedback.id).label("total_responses"),
    ).filter(
        Feedback.conference_id == conference_id
    ).group_by(Feedback.session_id).all()

    return {
        "conference_id": conference_id,
        "overall_avg_rating": round(overall, 2) if overall else None,
        "per_session": [
            {
                "session_id": row.session_id,
                "avg_rating": round(row.avg_rating, 2),
                "total_responses": row.total_responses,
            }
            for row in per_session
        ],
    }