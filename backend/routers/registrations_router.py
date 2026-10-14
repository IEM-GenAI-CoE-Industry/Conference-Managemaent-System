from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.auth import get_current_user
from backend.database import get_db
from backend.models import Conference, Registration, User

router = APIRouter(prefix="/registrations", tags=["Registrations"])

ALLOWED_REGISTRATION_CATEGORIES = {
    "participant",
    "student",
    "speaker",
    "author",
    "reviewer",
    "vip",
}


class RegistrationCreate(BaseModel):
    conference_id: int
    category: str = "participant"


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_registration(
    payload: RegistrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.conference_id <= 0:
        raise HTTPException(400, "Conference ID must be a positive integer")

    conference = db.query(Conference).filter(Conference.id == payload.conference_id).first()
    if not conference:
        raise HTTPException(404, "Conference not found")

    normalized_category = payload.category.strip().lower()
    if not normalized_category or normalized_category not in ALLOWED_REGISTRATION_CATEGORIES:
        raise HTTPException(
            400,
            "Invalid registration category. Allowed values: " + ", ".join(sorted(ALLOWED_REGISTRATION_CATEGORIES)),
        )

    existing = (
        db.query(Registration)
        .filter(
            Registration.user_id == current_user.id,
            Registration.conference_id == payload.conference_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(400, "User is already registered for this conference")

    registration = Registration(
        user_id=current_user.id,
        conference_id=payload.conference_id,
        category=normalized_category,
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return registration


@router.get("/me")
def get_my_registrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Registration).filter(Registration.user_id == current_user.id).all()
