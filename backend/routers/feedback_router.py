from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional

from backend.database import get_db
from backend.auth import get_current_user, require_role
from backend.models import Feedback, Session as SessionModel

router = APIRouter()

# ============================================================
# SCHEMAS
# ============================================================

class FeedbackCreate(BaseModel):
    session_id: int
    rating: int
    comments: Optional[str] = None

# ============================================================
# POST /feedback/ — submit feedback
# ============================================================

@router.post("/")
def submit_feedback(
    data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not 1 <= data.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    # Derive conference_id from session — no hardcoding
    session = db.query(SessionModel).filter(SessionModel.id == data.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    feedback = Feedback(
        session_id=data.session_id,
        user_id=current_user.id,
        conference_id=session.conference_id,
        rating=data.rating,
        comments=data.comments,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback

# ============================================================
# GET /feedback/ — list feedback for a conference
# ============================================================

@router.get("/")
def list_feedback(
    conference_id: int,
    db: Session = Depends(get_db),
):
    return db.query(Feedback).filter(
        Feedback.conference_id == conference_id
    ).all()

# ============================================================
# GET /feedback/summary — organizer only
# ============================================================

@router.get("/summary")
def feedback_summary(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("organizer")),
):
    overall = db.query(func.avg(Feedback.rating)).filter(
        Feedback.conference_id == conference_id
    ).scalar()

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