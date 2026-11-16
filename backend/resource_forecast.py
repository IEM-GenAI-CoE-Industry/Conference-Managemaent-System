"""Pure helpers for attendance-based resource forecasting."""
import math

DEFAULT_ATTENDANCE_RATE = 84.0
BUFFER_RATE = 1.07

def expected_attendance(registered_count: int, attendance_rate_percent: float) -> int:
    registered_count = max(0, int(registered_count))
    attendance_rate_percent = max(0.0, min(100.0, float(attendance_rate_percent)))
    return round(registered_count * attendance_rate_percent / 100)

def recommended_quantity(expected_count: int) -> int:
    """Apply the planning buffer and round up so fractional resources aren't lost."""
    return math.ceil(max(0, int(expected_count)) * BUFFER_RATE)

def validate_attendance_rate(rate: float) -> bool:
    return math.isfinite(rate) and 0 <= rate <= 100
