import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_role
from backend.database import get_db
from backend.models import Attendance, Certificate, Conference, Session as SessionModel, User

MOCK_USER_ID = 1

router = APIRouter(prefix="/certificates", tags=["Certificates"])


class CertGenerateSchema(BaseModel):
    conference_id: int
    user_id: Optional[int] = None


class CertOut(BaseModel):
    id: int
    certificate_uuid: str
    user_id: int
    conference_id: int
    issued_at: Optional[object] = None

    class Config:
        from_attributes = True


@router.post(
    "/generate",
    response_model=CertOut,
    status_code=status.HTTP_201_CREATED,
)
def generate_certificate(
    payload: CertGenerateSchema,
    db: Session = Depends(get_db),
    #current_user: User = Depends(require_role("organizer")),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Conference).filter(Conference.id == payload.conference_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conference not found")

   # target_user_id = payload.user_id or current_user.id
    # 2. Determine target user (Non-organizers can only generate for themselves)
    if current_user.role == "organizer" and payload.user_id:
        target_user_id = payload.user_id
    else:
        target_user_id = current_user.id
        
        
    if not db.query(User).filter(User.id == target_user_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
# Fix for C-06: Explicit attendance check with specific detail message instead of generic 403
    has_attended = (
        db.query(Attendance)
        .join(SessionModel, Attendance.session_id == SessionModel.id)
        .filter(
            SessionModel.conference_id == payload.conference_id,
            Attendance.user_id == target_user_id,
            Attendance.attended.is_(True),
        )
        .first()
    )

# Fix for C-06: Explicit attendance check with specific detail message instead of generic 403
    if not has_attended:
        raise HTTPException(
            #status_code=status.HTTP_400_BAD_REQUEST,
            #detail="User has not attended any session in this conference",

            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Certificate generation denied: User ID {target_user_id} has no verified attendance records for conference ID {payload.conference_id}.",        
        
        )

    existing = (
        db.query(Certificate)
        .filter(
            Certificate.user_id == target_user_id,
            Certificate.conference_id == payload.conference_id,
        )
        .first()
    )
    if existing:
        return existing

# Fix for M-17: Standardized Professional Certificate ID format
    formatted_uuid = f"CERT-CONF{payload.conference_id}-2026-{uuid.uuid4().hex[:6].upper()}"

    cert = Certificate(
        user_id=target_user_id,
        conference_id=payload.conference_id,
        certificate_uuid=formatted_uuid,
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert

# Fix for M-18: Organizer bulk export endpoint for conference certificates
@router.get("/conference/{conference_id}", response_model=List[CertOut])
def get_conference_certificates(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    if not db.query(Conference).filter(Conference.id == conference_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conference not found")

    return (
        db.query(Certificate)
        .filter(Certificate.conference_id == conference_id)
        .all()
    )

@router.get("/verify/{cert_uuid}", response_model=CertOut)
def verify_certificate(
    cert_uuid: str,
    db: Session = Depends(get_db),
):
    cert = (
        db.query(Certificate)
        .filter(Certificate.certificate_uuid == cert_uuid)
        .first()
    )
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate is invalid or non-existent",
        )
    return cert


@router.get("/me", response_model=List[CertOut])
def get_my_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Certificate)
        .filter(Certificate.user_id == current_user.id)
        .all()
    )
