from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Submission

MOCK_CONFERENCE_ID = 1
MOCK_USER_ID = 1  # Simulated current logged-in user

router = APIRouter(prefix="/submissions", tags=["Submissions"])

class SubmissionCreate(BaseModel):
    conference_id: int = MOCK_CONFERENCE_ID
    title: str
    abstract: str
    file_url: Optional[str] = None

class SubmissionStatusUpdate(BaseModel):
    status: str  # 'accepted' or 'rejected'

class SubmissionOut(BaseModel):
    id: int
    conference_id: int
    author_id: int
    title: str
    abstract: str
    file_url: Optional[str]
    status: str

    class Config:
        from_attributes = True

@router.post("/", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
def create_submission(payload: SubmissionCreate, db: Session = Depends(get_db)):
    sub = Submission(
        conference_id=payload.conference_id,
        author_id=MOCK_USER_ID,
        title=payload.title,
        abstract=payload.abstract,
        file_url=payload.file_url,
        status="submitted"
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

@router.get("/me", response_model=List[SubmissionOut])
def get_my_submissions(db: Session = Depends(get_db)):
    return db.query(Submission).filter(Submission.author_id == MOCK_USER_ID).all()

@router.patch("/{submission_id}/status", response_model=SubmissionOut)
def update_submission_status(submission_id: int, payload: SubmissionStatusUpdate, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    sub.status = payload.status
    db.commit()
    db.refresh(sub)
    return sub