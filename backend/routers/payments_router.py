from fastapi import APIRouter

router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)

@router.get("/")
def get_payments():
    return {"message": "Payments endpoint"}