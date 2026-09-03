from fastapi import APIRouter

router = APIRouter(
    prefix="/bottlenecks",
    tags=["Bottlenecks"]
)

@router.get("/")
def get_bottlenecks():
    return {"message": "Bottleneck detector endpoint"}