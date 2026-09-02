from fastapi import FastAPI

from backend.database import Base, engine
from backend.auth import router as auth_router
from backend.routers import sponsors_router, resource_forecast_router

# Import models before create_all so SQLAlchemy registers every model
# that is currently part of the project. Teammate-owned models can be
# added here automatically when their modules are merged.
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

app.include_router(resource_forecast_router.router)

# Teammate-owned routers will be included here after their PRs are
# reviewed and merged into this integration branch.
