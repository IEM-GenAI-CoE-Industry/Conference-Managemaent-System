from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import Base, engine
import backend.models  # noqa: F401
from backend.auth import router as auth_router
from backend.routers import conferences_router, sessions_router, sponsors_router, resource_forecast_router, feedback_router, dashboard_router, registrations_router, payments_router, attendance_router, bottleneck_router, reviewer_workload_router



from routers import reviews_router
from routers import announcements_router
from routers import search_router
from routers import certificates_router
from routers import submissions_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Conference Management System", version="1.0.0", description="Working prototype for conference lifecycle management")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home(): return {"message":"Conference Management System API is running"}

@app.get("/health")
def health(): return {"status":"healthy"}

app.include_router(auth_router)
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



app.include_router(submissions_router.router)
app.include_router(reviews_router.router)
app.include_router(announcements_router.router)
app.include_router(search_router.router)
app.include_router(certificates_router.router)
