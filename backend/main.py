from fastapi import FastAPI

from backend.database import Base, engine
from backend.auth import router as auth_router
from backend.routers import (
    conferences_router,
    sessions_router,
    sponsors_router,
    resource_forecast_router,
)

# Import models before create_all so SQLAlchemy registers every model.
import backend.models  # noqa: F401,E402

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Conference Management System",
    version="1.0.0",
    description="Conference Management System API",
)


@app.get("/")
def home():
    return {"message": "Conference Management System API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


app.include_router(auth_router)

app.include_router(
    sponsors_router.router,
    prefix="/sponsors",
    tags=["Sponsors"],
)

app.include_router(
    sponsors_router.exhibitor_router,
    prefix="/exhibitors",
    tags=["Exhibitors"],
)

# ============================================================
# OTHER TEAM MODULES
# ============================================================

app.include_router(
    conferences_router.router,
    prefix="/conferences",
    tags=["Conferences"],
)

app.include_router(
    sessions_router.router,
    prefix="/sessions",
    tags=["Sessions"],
)

app.include_router(
    sessions_router.rooms_router,
    prefix="/rooms",
    tags=["Rooms"],
)

app.include_router(resource_forecast_router.router)