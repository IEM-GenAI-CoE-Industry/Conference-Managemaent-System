from fastapi import FastAPI

app = FastAPI(title="Conference Management Backend")


@app.get("/")
def home():
    return {"message": "Backend is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


from routers import registrations_router, payments_router, attendance_router, bottleneck_router

app.include_router(registrations_router.router)
app.include_router(payments_router.router)
app.include_router(attendance_router.router)
app.include_router(bottleneck_router.router)