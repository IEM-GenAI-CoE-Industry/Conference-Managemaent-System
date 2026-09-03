from fastapi import FastAPI
from database import engine, Base
import models  # Ensures metadata is bound properly
# noqa: F401 - import so tables get registered on Base before create_all

import submissions_router
import reviews_router
import announcements_router
import search_router
import certificates_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Conference Management Backend")

# Registering all 5 routes
app.include_router(submissions_router.router)
app.include_router(reviews_router.router)
app.include_router(announcements_router.router)
app.include_router(search_router.router)
app.include_router(certificates_router.router)

@app.get("/")
def root():
    return {"status": "SWAPNA module operational"}


