from fastapi import APIRouter

from apps.api.db.connection import get_connection

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
)


@router.get("/student/{student_id}")
def student_analytics(student_id: int):
    with get_connection() as conn:
        student = conn.execute(
            """
            SELECT full_name
            FROM student_profiles
            WHERE id = %s
            """,
            (student_id,),
        ).fetchone()

        skills_count = conn.execute(
            """
            SELECT COUNT(*)
            FROM student_skills
            WHERE student_id = %s
            """,
            (student_id,),
        ).fetchone()[0]

        applications_count = conn.execute(
            """
            SELECT COUNT(*)
            FROM applications
            WHERE student_id = %s
            """,
            (student_id,),
        ).fetchone()[0]

        status_rows = conn.execute(
            """
            SELECT status, COUNT(*)
            FROM applications
            WHERE student_id = %s
            GROUP BY status
            ORDER BY status
            """,
            (student_id,),
        ).fetchall()

        total_jobs = conn.execute(
            """
            SELECT COUNT(*)
            FROM jobs
            """
        ).fetchone()[0]

    if not student:
        return {"detail": "Student not found"}

    status_breakdown = {
        row[0]: row[1]
        for row in status_rows
    }

    return {
        "student_id": student_id,
        "student_name": student[0],
        "total_jobs": total_jobs,
        "skills_count": skills_count,
        "applications_count": applications_count,
        "application_status": status_breakdown,
    }