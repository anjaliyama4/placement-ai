from fastapi import APIRouter

from apps.api.db.connection import get_connection

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/")
def get_jobs():
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, title, company, description, location, job_type, required_skills
            FROM jobs
            ORDER BY created_at DESC
            """
        ).fetchall()

    jobs = [
        {
            "id": row[0],
            "title": row[1],
            "company": row[2],
            "description": row[3],
            "location": row[4],
            "job_type": row[5],
            "required_skills": row[6],
        }
        for row in rows
    ]

    return {"jobs": jobs}
