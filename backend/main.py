from fastapi import FastAPI

from database import Base, engine
from auth import router as auth_router

from routers import conferences_router, sessions_router, sponsors_router


# ============================================================
# DATABASE
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="Conference Management System",
    version="1.0.0",
    description="Conference Management System API",
)


# ============================================================
# BASIC ROUTES
# ============================================================

@app.get("/")
def home():

    return {
        "message": "Conference Management System API is running"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


# ============================================================
# AUTHENTICATION
# ============================================================

app.include_router(
    auth_router
)


# ============================================================
# SPONSORS & EXHIBITORS
# ============================================================

app.include_router(
    sponsors_router.router,
    prefix="/sponsors",
    tags=["Sponsors & Exhibitors"],
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