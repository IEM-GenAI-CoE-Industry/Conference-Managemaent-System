from fastapi import FastAPI
from database import engine, Base
import models  # Ensures metadata is bound properly
# noqa: F401 - import so tables get registered on Base before create_all

from routers import reviews_router
from routers import announcements_router
from routers import search_router
from routers import certificates_router
from routers import submissions_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Conference Management Backend")

# Registering all 5 routes
app.include_router(submissions_router.router)
app.include_router(reviews_router.router)
app.include_router(announcements_router.router)
app.include_router(search_router.router)
app.include_router(certificates_router.router)

@app.get("/")
def home():
    return {"message": "Backend is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}