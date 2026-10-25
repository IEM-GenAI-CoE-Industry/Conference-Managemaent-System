import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_role
from backend.database import get_db
from backend.models import Conference, Submission, User, Review


MOCK_CONFERENCE_ID = 1

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/submissions", tags=["Submissions"])


class SubmissionCreate(BaseModel):
    conference_id: int = MOCK_CONFERENCE_ID
    title: str
    abstract: str
    #file_url: Optional[str] = None
    file_url: str

# Fix for H-04 & H-05: Enforce non-empty title, abstract, and valid PDF URL/path
    @validator("title", "abstract")
    def validate_non_empty(cls, v: str):
        if not v or not v.strip():
            raise ValueError("Field cannot be empty or contain only whitespace.")
        return v.strip()

    @validator("file_url")
    def validate_pdf_url(cls, v: str):
        if not v or not v.strip():
            raise ValueError("Manuscript file URL is required and cannot be empty.")
        clean_url = v.strip()
        if not (clean_url.lower().endswith(".pdf") or clean_url.startswith("/static/uploads/")):
            raise ValueError("Manuscript file must be a valid PDF document or upload path ending in .pdf.")
        return clean_url

#Fix for M-21
class SubmissionUpdate(BaseModel):
    title: Optional[str] = None
    abstract: Optional[str] = None
    keywords: Optional[str] = None
    file_url: Optional[str] = None

    @validator("title", "abstract")
    def validate_non_empty(cls, v: Optional[str]):
        if v is not None:
            if not v or not v.strip():
                raise ValueError("Field cannot be empty or contain only whitespace.")
            return v.strip()
        return v

    @validator("file_url")
    def validate_pdf_url(cls, v: Optional[str]):
        if v is not None:
            if not v or not v.strip():
                raise ValueError("Manuscript file URL cannot be empty.")
            clean_url = v.strip()
            if not (clean_url.lower().endswith(".pdf") or clean_url.startswith("/static/uploads/")):
                raise ValueError("Manuscript file must be a valid PDF document or upload path ending in .pdf.")
            return clean_url
        return v

class SubmissionStatusUpdate(BaseModel):
    status: str


class CameraReadyRequest(BaseModel):
    camera_ready_file_url: str
    notes: Optional[str] = None

    # Fix for H-05: Enforce PDF validation on camera-ready URLs
    @validator("camera_ready_file_url")
    def validate_camera_ready_pdf(cls, v: str):
        if not v or not v.strip():
            raise ValueError("Camera-ready file URL cannot be empty.")
        clean_url = v.strip()
        if not (clean_url.lower().endswith(".pdf") or clean_url.startswith("/static/uploads/")):
            raise ValueError("Camera-ready document must be a valid PDF ending in .pdf.")
        return clean_url

class SubmissionOut(BaseModel):
    id: int
    conference_id: int
    author_id: int
    title: str
    abstract: str
    file_url: Optional[str]
    status: str
    camera_ready_file_url: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True
        
        
# Fix for H-06        
class ReviewFeedbackOut(BaseModel):
    id: int
    score: int
    recommendation: str
    comments: Optional[str] = None

    class Config:
        from_attributes = True

class SubmissionDetailOut(SubmissionOut):
    reviews: List[ReviewFeedbackOut] = []

    class Config:
        from_attributes = True
        
# Fix for H-05: Multipart PDF File Upload Endpoint
@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_manuscript_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents (.pdf) are allowed for upload.",
        )

    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    contents = await file.read()
    if len(contents) > 15 * 1024 * 1024:  # 15 MB Size Limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 15MB limit.",
        )

    with open(file_path, "wb") as f:
        f.write(contents)

    return {
        "filename": file.filename,
        "file_url": f"/static/uploads/{unique_filename}",
    }

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
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conference not found")

#  DUPLICATE TITLE CHECK 
    existing_submission = db.query(Submission).filter(Submission.title == payload.title.strip()).first()
    if existing_submission:
        raise HTTPException(
            status_code=400,
            detail="A submission with this title already exists. Duplicate titles are not allowed."
        )
        
    submission = Submission(
        conference_id=payload.conference_id,
        author_id=current_user.id,
        #title=payload.title.strip(),
        #abstract=payload.abstract.strip(),
        title=payload.title,
        abstract=payload.abstract,
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


@router.get("/", response_model=List[SubmissionOut])
def get_all_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    return db.query(Submission).all()


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
    allowed_statuses = {
        "submitted",
        "under_review",
        "accepted",
        "rejected",
        "camera_ready_submitted",
        "final_accepted",
        "withdrawn",
    }

    if status_value not in allowed_statuses:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            #f"Status must be one of: {', '.join(allowed_statuses)}",
            detail=f"Status must be one of: {', '.join(allowed_statuses)}",
        )

    submission = (
        db.query(Submission)
        .filter(Submission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Submission not found")

# Fix for M-25: Enforce valid state transition graph
    current_status = submission.status.lower() if submission.status else "submitted"

    valid_transitions = {
        "submitted": ["under_review", "rejected"],
        "under_review": ["accepted", "rejected"],
        "accepted": ["camera_ready_submitted", "final_accepted"],
        "rejected": [],
        "camera_ready_submitted": ["final_accepted"],
        "final_accepted": [],
    }

    if status_value != current_status:
        allowed_next = valid_transitions.get(current_status, [])
        if status_value not in allowed_next:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from '{current_status}' to '{status_value}'. Allowed transitions: {allowed_next if allowed_next else 'None (Terminal state)'}"
            )
            
        
    submission.status = status_value
    db.commit()
    db.refresh(submission)
    return submission


@router.post(
    "/{submission_id}/camera-ready",
    response_model=SubmissionOut,
)
def submit_camera_ready(
    submission_id: int,
    payload: CameraReadyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    # Only callable by the submission author
    if submission.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the submission author can submit camera-ready files",
        )

    # Only valid if current status is accepted or camera_ready_submitted
    if submission.status not in ["accepted", "camera_ready_submitted"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Camera-ready versions can only be submitted for accepted papers",
        )

    submission.camera_ready_file_url = payload.camera_ready_file_url
    if payload.notes:
        submission.notes = payload.notes

    submission.status = "camera_ready_submitted"
    db.commit()
    db.refresh(submission)

    return submission


# Fix for H-06: Authors can now view detailed feedback, reviewer scores, recommendations, and comments on their submission detail pages
@router.get("/{submission_id}", response_model=SubmissionDetailOut)
def get_submission_detail(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    # Authors can only view their own submissions; organizers can view all
    if current_user.role == "author" and submission.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this submission",
        )

    reviews = db.query(Review).filter(Review.submission_id == submission_id).all()
    
    # Construct response dictionary or object
    result = SubmissionDetailOut.from_orm(submission)
    result.reviews = [ReviewFeedbackOut.from_orm(r) for r in reviews]
    return result

# Fix for M-21
@router.put("/{submission_id}", response_model=SubmissionOut)
def update_submission(
    submission_id: int,
    payload: SubmissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    if submission.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the submission author can edit this paper",
        )

    if submission.status not in ["submitted"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submissions can only be edited while in 'submitted' status before review begins.",
        )

    if payload.title is not None:
        submission.title = payload.title
    if payload.abstract is not None:
        submission.abstract = payload.abstract
    if payload.file_url is not None:
        submission.file_url = payload.file_url

    db.commit()
    db.refresh(submission)
    return submission


@router.post("/{submission_id}/withdraw", response_model=SubmissionOut)
def withdraw_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    if submission.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the submission author can withdraw this paper",
        )

    if submission.status not in ["submitted", "under_review"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission cannot be withdrawn once a decision has been rendered.",
        )

    submission.status = "withdrawn"
    db.commit()
    db.refresh(submission)
    return submission