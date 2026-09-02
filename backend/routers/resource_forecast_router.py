"""Attendance-Based Resource Forecasting.
Owner: Snehansha
"""

from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.auth import require_role
from backend.database import get_db
import backend.models as models
from backend.resource_forecast import (
    DEFAULT_ATTENDANCE_RATE,
    expected_attendance,
    recommended_quantity,
    validate_attendance_rate,
)

router = APIRouter(prefix="/resources", tags=["Resource Forecasting"])

# Prototype-only configuration store. It resets when the application restarts.
_attendance_overrides: Dict[int, float] = {}


class ForecastConfig(BaseModel):
    attendance_rate_percent: float = Field(ge=0, le=100)


def _get_attendance_rate(db: Session, conference_id: int) -> float:
    override = _attendance_overrides.get(conference_id)
    if override is not None:
        return override

    # Attendance is optional because the teammate-owned Attendance model may
    # not yet be merged. Once available, use actual attendance records.
    attendance_model = getattr(models, "Attendance", None)
    session_model = getattr(models, "Session", None)
    if attendance_model is not None and session_model is not None:
        total = (
            db.query(attendance_model)
            .join(session_model, attendance_model.session_id == session_model.id)
            .filter(session_model.conference_id == conference_id)
            .count()
        )
        if total:
            attended = (
                db.query(attendance_model)
                .join(session_model, attendance_model.session_id == session_model.id)
                .filter(
                    session_model.conference_id == conference_id,
                    attendance_model.attended.is_(True),
                )
                .count()
            )
            return (attended / total) * 100

    return DEFAULT_ATTENDANCE_RATE


@router.get("/forecast")
def get_resource_forecast(
    conference_id: int,
    db: Session = Depends(get_db),
):
    conference = (
        db.query(models.Conference)
        .filter(models.Conference.id == conference_id)
        .first()
    )
    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found.")

    registration_model = getattr(models, "Registration", None)
    if registration_model is not None:
        registered_count = (
            db.query(registration_model)
            .filter(registration_model.conference_id == conference_id)
            .count()
        )
    else:
        registered_count = 0

    attendance_rate = _get_attendance_rate(db, conference_id)
    expected = expected_attendance(registered_count, attendance_rate)
    recommended = recommended_quantity(expected)

    alert = None
    session_model = getattr(models, "Session", None)
    if session_model is not None:
        sessions = (
            db.query(session_model)
            .filter(session_model.conference_id == conference_id)
            .all()
        )
        if any(
            getattr(session, "room_capacity", None) is not None
            and session.room_capacity < expected
            for session in sessions
        ):
            alert = "Planned capacity may be insufficient"

    return {
        "registered_count": registered_count,
        "attendance_rate_percent": round(attendance_rate, 2),
        "expected_attendance": expected,
        "recommended_seats": recommended,
        "recommended_meals": recommended,
        "recommended_badges": recommended,
        "recommended_certificates": recommended,
        "alert": alert,
    }


@router.post("/forecast/config")
def configure_forecast(
    conference_id: int,
    payload: ForecastConfig,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("organizer")),
):
    conference = (
        db.query(models.Conference)
        .filter(models.Conference.id == conference_id)
        .first()
    )
    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found.")

    if not validate_attendance_rate(payload.attendance_rate_percent):
        raise HTTPException(
            status_code=400,
            detail="attendance_rate_percent must be between 0 and 100.",
        )

    _attendance_overrides[conference_id] = payload.attendance_rate_percent
    return {
        "conference_id": conference_id,
        "attendance_rate_percent": payload.attendance_rate_percent,
        "message": "Forecast attendance-rate override saved for this run.",
    }
