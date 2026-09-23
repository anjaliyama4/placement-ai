from fastapi import APIRouter

from apps.api.db.connection import get_connection

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("/")
def get_applications():
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, student_id, job_id, status, applied_at
            FROM applications
            ORDER BY applied_at DESC
            """
        ).fetchall()

    applications = [
        {
            "id": row[0],
            "student_id": row[1],
            "job_id": row[2],
            "status": row[3],
            "applied_at": row[4],
        }
        for row in rows
    ]

    return {"applications": applications}