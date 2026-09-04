from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Conference, Session as SessionModel, User

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/")
def global_search(
    q: str,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
) -> Dict[str, List[Any]]:
    if not q.strip():
        raise HTTPException(400, "Search query cannot be empty")

    if type not in {None, "conference", "session", "speaker"}:
        raise HTTPException(
            400,
            "type must be conference, session, speaker, or omitted",
        )

    results = {}
    query_str = f"%{q.strip()}%"

    if type is None or type == "conference":
        conferences = (
            db.query(Conference)
            .filter(
                (Conference.name.ilike(query_str))
                | (Conference.description.ilike(query_str))
            )
            .all()
        )
        results["conferences"] = [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "venue": c.venue,
                "created_by": c.created_by,
            }
            for c in conferences
        ]

    if type is None or type == "session":
        sessions = (
            db.query(SessionModel)
            .filter(
                (SessionModel.title.ilike(query_str))
                | (SessionModel.location.ilike(query_str))
            )
            .all()
        )
        results["sessions"] = [
            {
                "id": s.id,
                "title": s.title,
                "location": s.location,
                "conference_id": s.conference_id,
                "speaker_id": s.speaker_id,
                "start_time": s.start_time,
                "end_time": s.end_time,
            }
            for s in sessions
        ]

    if type is None or type == "speaker":
        speakers = (
            db.query(User)
            .filter(
                User.role == "speaker",
                User.name.ilike(query_str),
            )
            .all()
        )
        results["speakers"] = [
            {
                "id": sp.id,
                "name": sp.name,
                "email": sp.email,
                "role": sp.role,
            }
            for sp in speakers
        ]

    return results
