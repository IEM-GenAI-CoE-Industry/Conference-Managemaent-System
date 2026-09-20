from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.auth import get_current_user, require_role
from backend.database import get_db
from backend.models import Feedback, Session as SessionModel, User

router = APIRouter()
class FeedbackCreate(BaseModel):
    session_id: int
    rating: int = Field(ge=1, le=5)
    comments: Optional[str] = None

@router.post("/")
def submit_feedback(data: FeedbackCreate, db: Session=Depends(get_db), current_user: User=Depends(get_current_user)):
    session=db.query(SessionModel).filter(SessionModel.id==data.session_id).first()
    if not session: raise HTTPException(404,"Session not found")
    f=Feedback(session_id=data.session_id,user_id=current_user.id,conference_id=session.conference_id,rating=data.rating,comments=data.comments)
    db.add(f); db.commit(); db.refresh(f); return f

@router.get("/")
def list_feedback(conference_id:int,db:Session=Depends(get_db)):
    return db.query(Feedback).filter(Feedback.conference_id==conference_id).all()

@router.get("/summary")
def feedback_summary(conference_id:int,db:Session=Depends(get_db),current_user=Depends(require_role("organizer"))):
    overall=db.query(func.avg(Feedback.rating)).filter(Feedback.conference_id==conference_id).scalar()
    rows=db.query(Feedback.session_id,func.avg(Feedback.rating).label("avg_rating"),func.count(Feedback.id).label("total_responses")).filter(Feedback.conference_id==conference_id).group_by(Feedback.session_id).all()
    return {"conference_id":conference_id,"overall_avg_rating":round(float(overall),2) if overall is not None else None,"per_session":[{"session_id":r.session_id,"avg_rating":round(float(r.avg_rating),2),"total_responses":r.total_responses} for r in rows]}
