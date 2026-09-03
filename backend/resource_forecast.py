"""Helper functions for attendance-based resource forecasting."""

DEFAULT_ATTENDANCE_RATE = 84.0
BUFFER_RATE = 1.07


def expected_attendance(registered_count: int, attendance_rate_percent: float) -> int:
    return round(registered_count * attendance_rate_percent / 100)


def recommended_quantity(expected_count: int) -> int:
    return round(expected_count * BUFFER_RATE)


def validate_attendance_rate(rate: float) -> bool:
    return 0 <= rate <= 100
