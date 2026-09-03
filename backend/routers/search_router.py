
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Conference, Session as SessionModel, User

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("/")
def global_search(
    q: str, 
    type: Optional[str] = None, # 'conference', 'session', 'speaker', or None for all
    db: Session = Depends(get_db)
) -> Dict[str, List[Any]]:
    results = {}
    query_str = f"%{q}%"

    # 1. Search Conferences (returns venue, created_by)
    if type is None or type == "conference":
        confs = db.query(Conference).filter(
            (Conference.name.ilike(query_str)) | (Conference.description.ilike(query_str))
        ).all()
        results["conferences"] = [
            {
                "id": c.id, 
                "name": c.name, 
                "description": c.description,
                "venue": getattr(c, "venue", None),
                "created_by": c.created_by
            } 
            for c in confs
        ]

    # 2. Search Sessions (returns conference_id, speaker_id, times)
    if type is None or type == "session":
        sessions = db.query(SessionModel).filter(
            (SessionModel.title.ilike(query_str)) | (SessionModel.location.ilike(query_str))
        ).all()
        results["sessions"] = [
            {
                "id": s.id, 
                "title": s.title, 
                "location": s.location,
                "conference_id": s.conference_id,
                "speaker_id": getattr(s, "speaker_id", None),
                "start_time": s.start_time,
                "end_time": s.end_time
            } 
            for s in sessions
        ]

    # 3. Search Speakers
    if type is None or type == "speaker":
        speakers = db.query(User).filter(
            User.role == "speaker",
            User.name.ilike(query_str)
        ).all()
        results["speakers"] = [
            {
                "id": sp.id, 
                "name": sp.name, 
                "email": sp.email,
                "role": sp.role
            } 
            for sp in speakers
        ]

    return results