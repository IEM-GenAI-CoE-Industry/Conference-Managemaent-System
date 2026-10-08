from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import Base, SessionLocal, engine, upgrade_sqlite_schema
import backend.models  # noqa: F401
from backend.auth import router as auth_router, user_directory_router
from backend.routers import conferences_router, sessions_router, sponsors_router, resource_forecast_router, feedback_router, dashboard_router, registrations_router, payments_router, attendance_router, bottleneck_router, reviewer_workload_router


def ensure_demo_seed() -> None:
    try:
        with SessionLocal() as db:
            needed_demo_emails = {
                "organizer@demo.com",
                "participant@demo.com",
                "author@demo.com",
                "reviewer@demo.com",
                "speaker@demo.com",
            }
            existing_emails = {email for (email,) in db.query(backend.models.User.email).all()}
            has_conferences = db.query(backend.models.Conference.id).first() is not None
            if not has_conferences or not needed_demo_emails.issubset(existing_emails):
                db.close()
                engine.dispose()
                from backend.seed_demo import seed
                seed()
    except Exception:
        pass



from backend.routers import reviews_router
from backend.routers import announcements_router
from backend.routers import search_router
from backend.routers import certificates_router
from backend.routers import submissions_router

Base.metadata.create_all(bind=engine)
upgrade_sqlite_schema()
ensure_demo_seed()

app = FastAPI(title="Conference Management System", version="1.0.0", description="Working prototype for conference lifecycle management")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home(): return {"message":"Conference Management System API is running"}

@app.get("/health")
def health(): return {"status":"healthy"}

app.include_router(auth_router)
app.include_router(user_directory_router)
app.include_router(conferences_router.router)
app.include_router(sessions_router.router)
app.include_router(sessions_router.rooms_router)
app.include_router(sponsors_router.router, prefix="/sponsors")
app.include_router(sponsors_router.exhibitor_router, prefix="/exhibitors", tags=["Exhibitors"])
app.include_router(resource_forecast_router.router)
app.include_router(registrations_router.router)
app.include_router(payments_router.router)
app.include_router(attendance_router.router)
app.include_router(feedback_router.router, prefix="/feedback", tags=["Participant Feedback"])
app.include_router(dashboard_router.router, prefix="/dashboard", tags=["Conference Dashboard"])
app.include_router(bottleneck_router.router)
app.include_router(reviewer_workload_router.router)
app.include_router(reviewer_workload_router.submission_router)



app.include_router(submissions_router.router)
app.include_router(reviews_router.router)
app.include_router(announcements_router.router)
app.include_router(search_router.router)
app.include_router(certificates_router.router)
