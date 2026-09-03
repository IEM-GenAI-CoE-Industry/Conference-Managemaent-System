import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Certificate, Attendance, Session as SessionModel

MOCK_USER_ID = 1

router = APIRouter(prefix="/certificates", tags=["Certificates"])

class CertGenerateSchema(BaseModel):
    conference_id: int
    user_id: Optional[int] = MOCK_USER_ID

class CertOut(BaseModel):
    certificate_uuid: str
    user_id: int
    conference_id: int

    class Config:
        from_attributes = True

@router.post("/generate", response_model=CertOut, status_code=status.HTTP_201_CREATED)
def generate_certificate(payload: CertGenerateSchema, db: Session = Depends(get_db)):
    target_user_id = payload.user_id or MOCK_USER_ID

    # TASK 5: Attendance Check Verification
    # Joins Session to check if attendance exists for any session in given conference
    has_attended = db.query(Attendance).join(
        SessionModel, Attendance.session_id == SessionModel.id
    ).filter(
        SessionModel.conference_id == payload.conference_id,
        Attendance.user_id == target_user_id,
        Attendance.attended == True
    ).first()

    if not has_attended:
        raise HTTPException(
            status_code=400, 
            detail="User has not attended any session in this conference"
        )

    # Check if certificate already exists
    existing = db.query(Certificate).filter(
        Certificate.user_id == target_user_id,
        Certificate.conference_id == payload.conference_id
    ).first()
    
    if existing:
        return existing

    cert = Certificate(
        certificate_uuid=str(uuid.uuid4()),
        user_id=target_user_id,
        conference_id=payload.conference_id
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert

# Task 4 Public Endpoint (No Auth Needed)
@router.get("/verify/{cert_uuid}", response_model=CertOut)
def verify_certificate(cert_uuid: str, db: Session = Depends(get_db)):
    cert = db.query(Certificate).filter(Certificate.certificate_uuid == cert_uuid).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate is invalid or non-existent")
    return cert

@router.get("/me", response_model=List[CertOut])
def get_my_certificates(db: Session = Depends(get_db)):
    return db.query(Certificate).filter(Certificate.user_id == MOCK_USER_ID).all()