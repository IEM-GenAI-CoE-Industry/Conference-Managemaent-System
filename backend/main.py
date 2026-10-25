from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.database import Base, SessionLocal, engine, upgrade_sqlite_schema
import backend.models  # noqa: F401
from backend.auth import router as auth_router, user_directory_router
from backend.auth import hash_password, verify_password
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
                return

            # Demo credentials are part of the public local-development contract.
            # Reconcile them on startup so profile experiments or an interrupted
            # smoke test cannot make the README credentials stop working.
            demo_accounts = {
                "organizer@demo.com": ("Demo Organizer", "organizer"),
                "participant@demo.com": ("Demo Participant", "participant"),
                "author@demo.com": ("Demo Author", "author"),
                "reviewer@demo.com": ("Demo Reviewer", "reviewer"),
                "speaker@demo.com": ("Demo Speaker", "speaker"),
            }
            changed = False
            for email, (name, role) in demo_accounts.items():
                user = db.query(backend.models.User).filter(backend.models.User.email == email).first()
                if user and not verify_password("demo123", user.password):
                    user.password = hash_password("demo123")
                    changed = True
                if user and not user.is_active:
                    user.is_active = True
                    changed = True
            if changed:
                db.commit()
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

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    favicon_path = Path(__file__).resolve().parent / "static" / "favicon.ico"
    if favicon_path.exists():
        return FileResponse(favicon_path)
    return {"detail": "Favicon not found"}

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
