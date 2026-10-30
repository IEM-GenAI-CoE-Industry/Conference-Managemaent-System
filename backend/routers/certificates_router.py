import uuid
from typing import List, Optional
from io import BytesIO

from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_role
from backend.database import get_db
from backend.models import Attendance, Certificate, Conference, Session as SessionModel, Submission, User

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


@router.get("/options")
def certificate_options(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    attended = db.query(Attendance).join(SessionModel, Attendance.session_id == SessionModel.id).filter(Attendance.attended.is_(True))
    if current_user.role != "organizer":
        attended = attended.filter(Attendance.user_id == current_user.id)
    pairs = {(row.user_id, row.session.conference_id) for row in attended.all()}
    conferences = {c.id: c for c in db.query(Conference).all()}
    users = {u.id: u for u in db.query(User).all()}
    return [{"conference_id": conference_id, "conference_name": conferences[conference_id].title, "user_id": user_id, "attendee_name": users[user_id].username, "eligible": True} for user_id, conference_id in sorted(pairs)]


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
    
    has_accepted_paper = (
        db.query(Submission)
        .filter(
            Submission.conference_id == payload.conference_id,
            Submission.author_id == target_user_id,
            Submission.status.in_(["accepted", "final_accepted", "camera_ready_submitted"])
        )
        .first()
    )

# Fix for C-06: Explicit attendance check with specific detail message instead of generic 403
    if not has_attended and not has_accepted_paper and current_user.role != "organizer":
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

class CertificateTemplateSchema(BaseModel):
    title: str
    body: str
    theme: str

@router.get("/template/{conference_id}")
def get_certificate_template(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    conference = db.query(Conference).filter(
        Conference.id == conference_id
    ).first()

    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found")

    return {
        "conference_id": conference.id,
        "title": getattr(conference, "certificate_title", None)
        or "CERTIFICATE OF PARTICIPATION",
        "body": getattr(conference, "certificate_body", None)
        or "This certificate is presented to",
        "theme": getattr(conference, "certificate_theme", None)
        or "#24476B",
    }

@router.put("/template/{conference_id}")
def save_certificate_template(
    conference_id: int,
    payload: CertificateTemplateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    conference = db.query(Conference).filter(
        Conference.id == conference_id
    ).first()

    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found")

    if not payload.title.strip() or not payload.body.strip():
        raise HTTPException(status_code=400, detail="Title and body are required")

    if not payload.theme.startswith("#") or len(payload.theme) != 7:
        raise HTTPException(status_code=400, detail="Theme must be a hex color")

    conference.certificate_title = payload.title.strip()[:200]
    conference.certificate_body = payload.body.strip()
    conference.certificate_theme = payload.theme

    db.commit()
    db.refresh(conference)

    return {
        "message": "Certificate template saved",
        "conference_id": conference.id,
        "title": conference.certificate_title,
        "body": conference.certificate_body,
        "theme": conference.certificate_theme,
    }

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


@router.get("/pdf/{cert_uuid}")
def download_certificate_pdf(
    cert_uuid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cert = (
        db.query(Certificate)
        .filter(Certificate.certificate_uuid == cert_uuid)
        .first()
    )
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    # Participants can download only their own certificates.
    # Organizers can download certificates for any user.
    if (
        current_user.role != "organizer"
        and cert.user_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Not authorized")

    user = db.query(User).filter(User.id == cert.user_id).first()
    conference = (
        db.query(Conference)
        .filter(Conference.id == cert.conference_id)
        .first()
    )

    if not user or not conference:
        raise HTTPException(
            status_code=404,
            detail="Certificate recipient or conference not found",
        )

    recipient_name = (
        getattr(user, "name", None)
        or getattr(user, "full_name", None)
        or getattr(user, "email", None)
        or f"Participant {user.id}"
    )
    conference_name = (
        getattr(conference, "name", None)
        or getattr(conference, "title", None)
        or f"Conference {conference.id}"
    )

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)

        # Load saved certificate template settings, with defaults
    certificate_title = (
        getattr(conference, "certificate_title", None)
        or "CERTIFICATE OF PARTICIPATION"
    )
    certificate_body = (
        getattr(conference, "certificate_body", None)
        or "This certificate is presented to"
    )
    certificate_theme = (
        getattr(conference, "certificate_theme", None)
        or "#24476B"
    )

    # Certificate border and heading
    pdf.setStrokeColor(colors.HexColor(certificate_theme))
    pdf.setLineWidth(4)
    pdf.rect(30, 30, width - 60, height - 60)

    pdf.setFillColor(colors.HexColor(certificate_theme))
    pdf.setFont("Helvetica-Bold", 27)
    pdf.drawCentredString(
        width / 2, height - 115, certificate_title[:100]
    )

    pdf.setFillColor(colors.black)
    pdf.setFont("Helvetica", 16)
    pdf.drawCentredString(
        width / 2, height - 170, certificate_body[:150]
    )

    pdf.setFillColor(colors.HexColor(certificate_theme))
    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawCentredString(width / 2, height - 220, str(recipient_name)[:100])
    pdf.setFont("Helvetica-Bold", 19)
    pdf.drawCentredString(width / 2, height - 300, str(conference_name)[:120])

    pdf.setFont("Helvetica", 10)
    pdf.drawCentredString(
        width / 2,
        75,
        f"Certificate ID: {cert.certificate_uuid}",
    )

    if cert.issued_at:
        pdf.drawCentredString(
            width / 2,
            58,
            f"Issued: {cert.issued_at.strftime('%d %B %Y')}",
        )

    pdf.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="certificate-{cert.certificate_uuid}.pdf"'
            )
        },
    )

@router.post("/bulk-generate/{conference_id}")
def bulk_generate_certificates(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("organizer")),
):
    conference = db.query(Conference).filter(
        Conference.id == conference_id
    ).first()

    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found")

    attended = (
        db.query(Attendance.user_id)
        .join(SessionModel, Attendance.session_id == SessionModel.id)
        .filter(
            SessionModel.conference_id == conference_id,
            Attendance.attended.is_(True),
        )
        .distinct()
        .all()
    )

    issued = []
    for (user_id,) in attended:
        existing = db.query(Certificate).filter(
            Certificate.user_id == user_id,
            Certificate.conference_id == conference_id,
        ).first()

        if existing:
            continue

        cert = Certificate(
            user_id=user_id,
            conference_id=conference_id,
            certificate_uuid=(
                f"CERT-CONF{conference_id}-2026-{uuid.uuid4().hex[:6].upper()}"
            ),
        )
        db.add(cert)
        issued.append(cert)

    db.commit()

    return {
        "conference_id": conference_id,
        "new_certificates_issued": len(issued),
        "message": "Bulk certificate generation completed.",
    }