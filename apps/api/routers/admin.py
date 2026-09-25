from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from apps.api.db.connection import get_connection
from apps.api.security import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])

class JobCreate(BaseModel):
    title: str
    company: str
    description: str
    location: str
    job_type: str
    required_skills: list[str] = []

class JobStatusUpdate(BaseModel):
    status: str

@router.get("/jobs")
def admin_jobs(admin=Depends(require_admin)):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, title, company, description, location, job_type, required_skills
            FROM jobs ORDER BY created_at DESC
            """
        ).fetchall()
    return {
        "jobs": [
            {
                "id": r[0], "title": r[1], "company": r[2],
                "description": r[3], "location": r[4],
                "job_type": r[5], "required_skills": r[6]
            }
            for r in rows
        ]
    }

@router.post("/jobs")
def create_job(job: JobCreate, admin=Depends(require_admin)):
    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO jobs
                (title, company, description, location, job_type, required_skills)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                job.title, job.company, job.description,
                job.location, job.job_type, job.required_skills
            ),
        ).fetchone()
    return {"message": "Job created successfully", "job_id": row[0]}

@router.get("/applications")
def admin_applications(admin=Depends(require_admin)):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT a.id, sp.full_name, j.title, j.company,
                   a.status, a.applied_at
            FROM applications a
            JOIN student_profiles sp ON sp.id = a.student_id
            JOIN jobs j ON j.id = a.job_id
            ORDER BY a.applied_at DESC
            """
        ).fetchall()
    return {
        "applications": [
            {
                "id": r[0], "student_name": r[1],
                "job_title": r[2], "company": r[3],
                "status": r[4], "applied_at": r[5]
            }
            for r in rows
        ]
    }

@router.patch("/applications/{application_id}/status")
def update_application_status(
    application_id: int,
    update: JobStatusUpdate,
    admin=Depends(require_admin),
):
    allowed = {"applied", "shortlisted", "interview", "selected", "rejected"}
    status_value = update.status.strip().lower()

    if status_value not in allowed:
        raise HTTPException(status_code=400, detail="Invalid application status")

    with get_connection() as conn:
        row = conn.execute(
            """
            UPDATE applications
            SET status = %s
            WHERE id = %s
            RETURNING id, status
            """,
            (status_value, application_id),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Application not found")

    return {
        "message": "Application status updated successfully",
        "application": {"id": row[0], "status": row[1]},
    }
