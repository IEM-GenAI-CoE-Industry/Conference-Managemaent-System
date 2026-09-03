from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.auth import get_current_user, require_role
from backend.database import get_db
from backend.models import Payment, Registration, User

router = APIRouter(prefix="/payments", tags=["Payments"])

class PaymentCreate(BaseModel):
    registration_id: int
    amount: float = Field(gt=0)

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    registration = db.query(Registration).filter(Registration.id == payload.registration_id).first()
    if not registration:
        raise HTTPException(404, "Registration not found")
    if registration.user_id != current_user.id and current_user.role != "organizer":
        raise HTTPException(403, "You can only create your own payment")
    if db.query(Payment).filter(Payment.registration_id == registration.id).first():
        raise HTTPException(400, "Payment already exists for this registration")
    payment = Payment(registration_id=registration.id, user_id=registration.user_id, amount=payload.amount, status="pending")
    db.add(payment); db.commit(); db.refresh(payment)
    return payment

@router.post("/{payment_id}/confirm")
def confirm_payment(payment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("organizer"))):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment: raise HTTPException(404, "Payment not found")
    payment.status = "paid"; payment.confirmed_at = datetime.utcnow()
    db.commit(); db.refresh(payment)
    return payment

@router.get("/me")
def get_my_payments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Payment).filter(Payment.user_id == current_user.id).all()
