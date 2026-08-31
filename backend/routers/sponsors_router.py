"""
routers/sponsors_router.py — Sponsor & Exhibitor Management.
Owner: Lead
Deliverable #15
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy.orm import Session

from auth import require_role
from database import get_db
import models


router = APIRouter()


# -----------------------------------------------------------------------------
# SCHEMAS
# -----------------------------------------------------------------------------

class SponsorCreate(BaseModel):
    conference_id: int
    name: str
    tier: str
    contact_email: Optional[EmailStr] = None
    logo_url: Optional[str] = None


class SponsorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conference_id: int
    name: str
    tier: str
    contact_email: Optional[EmailStr] = None
    logo_url: Optional[str] = None


class ExhibitorCreate(BaseModel):
    conference_id: int
    name: str
    booth_location: Optional[str] = None
    description: Optional[str] = None


class ExhibitorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conference_id: int
    name: str
    booth_location: Optional[str] = None
    description: Optional[str] = None


# -----------------------------------------------------------------------------
# SPONSORS
# -----------------------------------------------------------------------------

@router.post("/", response_model=SponsorResponse, status_code=status.HTTP_201_CREATED)
def add_sponsor(
    payload: SponsorCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin", "organizer")),
):
    conference = db.query(models.Conference).filter(
        models.Conference.id == payload.conference_id
    ).first()

    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found.")

    tier = payload.tier.strip().lower()
    if tier not in {"gold", "silver", "bronze"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid tier. Use gold, silver, or bronze.",
        )

    sponsor = models.Sponsor(
        conference_id=payload.conference_id,
        name=payload.name.strip(),
        tier=tier,
        contact_email=str(payload.contact_email) if payload.contact_email else None,
        logo_url=payload.logo_url,
    )
    db.add(sponsor)
    db.commit()
    db.refresh(sponsor)
    return sponsor


@router.get("/", response_model=List[SponsorResponse])
def list_sponsors(conference_id: int, db: Session = Depends(get_db)):
    return db.query(models.Sponsor).filter(
        models.Sponsor.conference_id == conference_id
    ).all()


# -----------------------------------------------------------------------------
# EXHIBITORS
# -----------------------------------------------------------------------------

@router.post(
    "/exhibitors/",
    response_model=ExhibitorResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_exhibitor(
    payload: ExhibitorCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin", "organizer")),
):
    conference = db.query(models.Conference).filter(
        models.Conference.id == payload.conference_id
    ).first()

    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found.")

    exhibitor = models.Exhibitor(
        conference_id=payload.conference_id,
        name=payload.name.strip(),
        booth_location=payload.booth_location,
        description=payload.description,
    )
    db.add(exhibitor)
    db.commit()
    db.refresh(exhibitor)
    return exhibitor


@router.get("/exhibitors/", response_model=List[ExhibitorResponse])
def list_exhibitors(conference_id: int, db: Session = Depends(get_db)):
    return db.query(models.Exhibitor).filter(
        models.Exhibitor.conference_id == conference_id
    ).all()
