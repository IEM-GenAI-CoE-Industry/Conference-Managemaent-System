import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_role
from backend.database import get_db
from backend.models import Conference, Payment, Registration, User
from backend.routers.registrations_router import CATEGORY_FEES

router = APIRouter(prefix="/payments", tags=["Payments"])


class PaymentCreate(BaseModel):
    registration_id: int


class GatewayResult(BaseModel):
    outcome: str = "success"


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def serialize(payment: Payment):
    return {"id": payment.id, "registration_id": payment.registration_id, "conference_name": payment.registration.conference.title, "category": payment.registration.category, "amount": payment.amount, "currency": payment.currency, "status": payment.status, "provider": payment.provider, "gateway_order_id": payment.gateway_order_id, "gateway_payment_id": payment.gateway_payment_id, "failure_reason": payment.failure_reason, "created_at": payment.created_at, "confirmed_at": payment.confirmed_at, "refunded_at": payment.refunded_at}


def serialize_for_organizer(payment: Payment):
    return {
        **serialize(payment),
        "attendee_name": payment.user.username,
        "attendee_email": payment.user.email,
        "attendee_role": payment.user.role,
        "conference_id": payment.registration.conference_id,
    }


@router.get("/manage")
def manage_payments(db: Session = Depends(get_db), current_user: User = Depends(require_role("organizer"))):
    payments = (
        db.query(Payment)
        .join(Registration, Payment.registration_id == Registration.id)
        .join(Conference, Registration.conference_id == Conference.id)
        .filter(Conference.organizer_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .all()
    )
    rows = [serialize_for_organizer(payment) for payment in payments]
    paid = [payment for payment in payments if payment.status == "paid"]
    refunded = [payment for payment in payments if payment.status == "refunded"]
    return {
        "summary": {
            "transactions": len(payments),
            "paid_count": len(paid),
            "pending_count": sum(payment.status == "pending" for payment in payments),
            "failed_count": sum(payment.status in {"failed", "cancelled"} for payment in payments),
            "refunded_count": len(refunded),
            "collected": round(sum(payment.amount for payment in paid), 2),
            "refunded": round(sum(payment.amount for payment in refunded), 2),
            "currency": "INR",
        },
        "payments": rows,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    registration = db.query(Registration).filter(Registration.id == payload.registration_id).first()
    if not registration:
        raise HTTPException(404, "Registration not found")
    if registration.user_id != current_user.id:
        raise HTTPException(403, "You can only pay for your own registration")
    fee = CATEGORY_FEES.get(registration.category)
    if fee is None:
        raise HTTPException(422, "This registration category has no configured fee")
    if fee == 0:
        raise HTTPException(400, "No payment is required for this registration")
    existing = db.query(Payment).filter(Payment.registration_id == registration.id).first()
    if existing:
        return serialize(existing)
    payment = Payment(registration_id=registration.id, user_id=current_user.id, amount=fee, currency="INR", provider="college_demo_gateway", gateway_order_id=f"ord_{secrets.token_hex(8)}", status="pending")
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return serialize(payment)


@router.post("/{payment_id}/gateway-callback")
def gateway_callback(payment_id: int, result: GatewayResult, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.user_id != current_user.id:
        raise HTTPException(403, "Not authorized")
    if payment.status == "paid":
        return serialize(payment)
    if result.outcome not in {"success", "failed", "cancelled"}:
        raise HTTPException(422, "Invalid gateway outcome")
    if result.outcome == "success":
        payment.status = "paid"
        payment.gateway_payment_id = f"pay_{secrets.token_hex(8)}"
        payment.confirmed_at = now()
        payment.failure_reason = None
        payment.registration.status = "confirmed"
    else:
        payment.status = result.outcome
        payment.failure_reason = "Bank declined the transaction" if result.outcome == "failed" else "Checkout was cancelled"
    db.commit()
    db.refresh(payment)
    return serialize(payment)


@router.post("/{payment_id}/refund")
def refund_payment(payment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("organizer"))):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.registration.conference.organizer_id != current_user.id:
        raise HTTPException(403, "You can only refund payments for conferences you organize")
    if payment.status != "paid":
        raise HTTPException(409, "Only a paid transaction can be refunded")
    payment.status = "refunded"
    payment.refunded_at = now()
    payment.registration.status = "cancelled"
    db.commit()
    db.refresh(payment)
    return serialize(payment)


@router.get("/me")
def get_my_payments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [serialize(p) for p in db.query(Payment).filter(Payment.user_id == current_user.id).order_by(Payment.created_at.desc()).all()]


@router.get("/{payment_id}/receipt")
def get_receipt(payment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    organizer_owns_conference = bool(payment and current_user.role == "organizer" and payment.registration.conference.organizer_id == current_user.id)
    if not payment or (payment.user_id != current_user.id and not organizer_owns_conference):
        raise HTTPException(404, "Receipt not found")
    if payment.status not in {"paid", "refunded"}:
        raise HTTPException(409, "A receipt is available after successful payment")
    return {**serialize(payment), "receipt_number": f"CMS-{payment.confirmed_at.year}-{payment.id:06d}", "payer": payment.user.username}
