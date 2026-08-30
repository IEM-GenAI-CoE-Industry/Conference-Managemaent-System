from fastapi import FastAPI

app = FastAPI(title="Conference Management Backend")


@app.get("/")
def home():
    return {"message": "Backend is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}