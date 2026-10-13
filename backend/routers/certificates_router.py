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
    current_user: User = Depends(require_role("organizer")),
):
    if not db.query(Conference).filter(Conference.id == payload.conference_id).first():
        raise HTTPException(404, "Conference not found")

    target_user_id = payload.user_id or current_user.id

    if not db.query(User).filter(User.id == target_user_id).first():
        raise HTTPException(404, "User not found")

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

    if not has_attended:
        raise HTTPException(
            status_code=400,
            detail="User has not attended any session in this conference",
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

    cert = Certificate(
        user_id=target_user_id,
        conference_id=payload.conference_id,
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


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
            status_code=404,
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


@router.get("/preview/{conference_id}")
def preview_certificate(
    conference_id: int,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("organizer")),
):
    conference = db.query(Conference).filter(
        Conference.id == conference_id
    ).first()

    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found")

    target_user_id = user_id or current_user.id
    user = db.query(User).filter(User.id == target_user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "preview": True,
        "template": "conference_participation",
        "recipient_name": (
            getattr(user, "name", None)
            or getattr(user, "full_name", None)
            or getattr(user, "email", "Participant")
        ),
        "conference_name": (
            getattr(conference, "name", None)
            or getattr(conference, "title", None)
            or f"Conference {conference.id}"
        ),
        "certificate_text": "Certificate of Participation",
        "status": "Preview only — certificate has not been issued",
    }
