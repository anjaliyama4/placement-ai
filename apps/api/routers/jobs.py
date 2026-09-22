from fastapi import APIRouter

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/")
def get_jobs():
    return {"jobs": []}
