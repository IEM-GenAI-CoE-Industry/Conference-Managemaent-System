"""Attendance-based resource forecasting with persistent per-conference overrides."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.auth import require_role
from backend.database import get_db
import backend.models as models
from backend.resource_forecast import DEFAULT_ATTENDANCE_RATE, expected_attendance, recommended_quantity, validate_attendance_rate

router = APIRouter(prefix="/resources", tags=["Resource Forecasting"])
class ForecastConfig(BaseModel):
    attendance_rate_percent: float = Field(ge=0, le=100)

def _get_attendance_rate(db: Session, conference_id: int) -> tuple[float, str]:
    setting = db.query(models.ResourceForecastSetting).filter_by(conference_id=conference_id).first()
    if setting:
        return float(setting.attendance_rate_percent), "organizer_override"
    attendance_model = getattr(models, "Attendance", None)
    session_model = getattr(models, "Session", None)
    if attendance_model is not None and session_model is not None:
        total = (db.query(attendance_model).join(session_model, attendance_model.session_id == session_model.id)
                 .filter(session_model.conference_id == conference_id).count())
        if total:
            attended = (db.query(attendance_model).join(session_model, attendance_model.session_id == session_model.id)
                        .filter(session_model.conference_id == conference_id, attendance_model.attended.is_(True)).count())
            return attended / total * 100, "recorded_attendance"
    return DEFAULT_ATTENDANCE_RATE, "default_assumption_no_history"

@router.get("/forecast")
def get_resource_forecast(conference_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("organizer"))):
    conference = db.query(models.Conference).filter(models.Conference.id == conference_id).first()
    if not conference: raise HTTPException(status_code=404, detail="Conference not found. Choose a conference from the conference list.")
    registered_count = db.query(models.Registration).filter(models.Registration.conference_id == conference_id).count()
    attendance_rate, source = _get_attendance_rate(db, conference_id)
    expected = expected_attendance(registered_count, attendance_rate)
    recommended = recommended_quantity(expected)
    alert = None
    if any(s.room_capacity is not None and s.room_capacity < expected for s in db.query(models.Session).filter_by(conference_id=conference_id).all()):
        alert = "Planned session capacity may be insufficient for expected attendance."
    return {"conference_id": conference_id, "conference_name": conference.title, "registered_count": registered_count,
            "attendance_rate_percent": round(attendance_rate, 2), "attendance_rate_source": source,
            "expected_attendance": expected, "buffer_percent": 7,
            "recommended_seats": recommended, "recommended_meals": recommended,
            "recommended_badges": recommended, "recommended_certificates": recommended, "alert": alert,
            "assumptions": ["Expected attendance = registrations × attendance rate.", "Resource quantities include a 7% planning buffer.", "When no attendance history or override exists, the default 84% rate is an explicit assumption."]}

@router.post("/forecast/config")
def configure_forecast(conference_id: int, payload: ForecastConfig, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("organizer"))):
    if not db.query(models.Conference).filter(models.Conference.id == conference_id).first():
        raise HTTPException(status_code=404, detail="Conference not found.")
    if not validate_attendance_rate(payload.attendance_rate_percent):
        raise HTTPException(status_code=400, detail="Attendance rate must be between 0 and 100 percent.")
    setting = db.query(models.ResourceForecastSetting).filter_by(conference_id=conference_id).first()
    if setting is None:
        setting = models.ResourceForecastSetting(conference_id=conference_id, attendance_rate_percent=payload.attendance_rate_percent)
        db.add(setting)
    else: setting.attendance_rate_percent = payload.attendance_rate_percent
    db.commit()
    return {"conference_id": conference_id, "attendance_rate_percent": payload.attendance_rate_percent, "message": "Attendance-rate override saved."}
