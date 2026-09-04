from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_role
from backend.database import get_db
from backend.models import Conference, Submission, User

MOCK_CONFERENCE_ID = 1

router = APIRouter(prefix="/submissions", tags=["Submissions"])


class SubmissionCreate(BaseModel):
    conference_id: int = MOCK_CONFERENCE_ID
    title: str
    abstract: str
    file_url: Optional[str] = None


class SubmissionStatusUpdate(BaseModel):
    status: str


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


@router.post(
    "/",
    response_model=SubmissionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_submission(
    payload: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("author")),
):
    if not db.query(Conference).filter(Conference.id == payload.conference_id).first():
        raise HTTPException(404, "Conference not found")

    submission = Submission(
        conference_id=payload.conference_id,
        author_id=current_user.id,
        title=payload.title.strip(),
        abstract=payload.abstract.strip(),
        file_url=payload.file_url,
        status="submitted",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.get("/me", response_model=List[SubmissionOut])
def get_my_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Submission)
        .filter(Submission.author_id == current_user.id)
        .all()
    )


@router.patch(
    "/{submission_id}/status",
    response_model=SubmissionOut,
)
def update_submission_status(
    submission_id: int,
    payload: SubmissionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    status_value = payload.status.strip().lower()
    if status_value not in {"submitted", "accepted", "rejected"}:
        raise HTTPException(400, "Status must be submitted, accepted, or rejected")

    submission = (
        db.query(Submission)
        .filter(Submission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(404, "Submission not found")

    submission.status = status_value
    db.commit()
    db.refresh(submission)
    return submission
