from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.auth import require_role
from backend.database import get_db

router = APIRouter(prefix="/reviewers", tags=["Reviewer Workload"])

@router.get("/workload")
def reviewer_workload(conference_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("organizer"))):
    return {"conference_id": conference_id, "reviewers": [], "note": "Waiting for Swapna's submissions/reviews module to be merged."}

@router.get("/workload/suggest")
def suggest_reviewer(conference_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("organizer"))):
    return {"conference_id": conference_id, "recommended_reviewer_id": None, "reviewer_name": None, "current_load": 0, "note": "Waiting for Swapna's reviews module."}
