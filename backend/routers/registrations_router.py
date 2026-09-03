from fastapi import APIRouter

# MOCK IDs (Assignment spec ke hisaab se)
MOCK_CONFERENCE_ID = 1
MOCK_USER_ID = 1

# Router setup
router = APIRouter(
    prefix="/registrations",
    tags=["Registrations"]
)

# Task 1: POST /registrations/
@router.post("/")
def create_registration():
    # Abhi ke liye ek dummy response, baad mein database logic dalenge
    return {
        "status": "success", 
        "message": "Registration created successfully", 
        "conference_id": MOCK_CONFERENCE_ID
    }

# Task 1: GET /registrations/me
@router.get("/me")
def get_my_registrations():
    # User ko uski registration dikhane ke liye
    return {
        "status": "success",
        "message": "Fetching registrations for current user",
        "user_id": MOCK_USER_ID,
        "conference_id": MOCK_CONFERENCE_ID
    }