from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.models import Conference, Registration, User

router = APIRouter(prefix="/registrations", tags=["Registrations"])
CATEGORY_FEES = {"student": 500.0, "participant": 1000.0, "author": 750.0, "speaker": 0.0, "reviewer": 0.0, "vip": 0.0}


class RegistrationCreate(BaseModel):
    conference_id: int
    category: str = "participant"


def serialize(registration: Registration):
    payment = registration.payment
    fee = CATEGORY_FEES[registration.category]
    return {"id": registration.id, "conference_id": registration.conference_id, "conference_name": registration.conference.title, "category": registration.category, "status": registration.status, "fee": fee, "currency": "INR", "payment_status": payment.status if payment else ("waived" if fee == 0 else "not_started"), "created_at": registration.created_at}


@router.get("/options")
def registration_options(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    categories = ["student", "participant", "author"]
    if current_user.role in {"speaker", "reviewer"}:
        categories.append(current_user.role)
    return {"conferences": [{"id": c.id, "name": c.title, "start_date": c.start_date, "location": c.location} for c in db.query(Conference).order_by(Conference.start_date).all()], "categories": [{"value": key, "label": key.title(), "fee": CATEGORY_FEES[key], "currency": "INR"} for key in categories]}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_registration(payload: RegistrationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conference = db.query(Conference).filter(Conference.id == payload.conference_id).first()
    if not conference:
        raise HTTPException(404, "The selected conference is no longer available. Please refresh and choose another conference.")
    category = payload.category.strip().lower()
    if category not in CATEGORY_FEES:
        raise HTTPException(422, {"field": "category", "message": "Please choose a valid registration category."})
    if category in {"speaker", "reviewer", "vip"} and current_user.role not in {category, "organizer"}:
        raise HTTPException(403, f"The {category} category is invitation-only.")
    existing = db.query(Registration).filter(Registration.user_id == current_user.id, Registration.conference_id == conference.id).first()
    if existing:
        raise HTTPException(409, "You are already registered for this conference. Open My Registrations to continue payment.")
    registration = Registration(user_id=current_user.id, conference_id=conference.id, category=category)
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return serialize(registration)


@router.get("/me")
def get_my_registrations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [serialize(row) for row in db.query(Registration).filter(Registration.user_id == current_user.id).order_by(Registration.created_at.desc()).all()]
