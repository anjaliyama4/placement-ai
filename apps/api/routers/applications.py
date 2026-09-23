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


@router.get("/student/{student_id}")
def get_student_applications(student_id: int):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT a.id, a.job_id, j.title, j.company, a.status, a.applied_at
            FROM applications a
            JOIN jobs j ON j.id = a.job_id
            WHERE a.student_id = %s
            ORDER BY a.applied_at DESC
            """,
            (student_id,),
        ).fetchall()

    applications = [
        {
            "id": row[0],
            "job_id": row[1],
            "job_title": row[2],
            "company": row[3],
            "status": row[4],
            "applied_at": row[5],
        }
        for row in rows
    ]

    return {"student_id": student_id, "applications": applications}