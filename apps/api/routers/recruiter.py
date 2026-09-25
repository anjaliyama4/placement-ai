from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from apps.api.db.connection import get_connection
from apps.api.security import get_current_user

router = APIRouter(prefix="/recruiter", tags=["recruiter"])

def require_recruiter(user=Depends(get_current_user)):
    if user["role"] != "recruiter":
        raise HTTPException(status_code=403, detail="Recruiter access required")
    return user

class JobCreate(BaseModel):
    title: str
    company: str
    description: str
    location: str
    job_type: str
    required_skills: list[str] = []

@router.get("/jobs")
def recruiter_jobs(user=Depends(require_recruiter)):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, title, company, description, location, job_type, required_skills
            FROM jobs WHERE recruiter_id = %s ORDER BY created_at DESC
            """, (user["id"],)
        ).fetchall()
    return {"jobs": [
        {"id": r[0], "title": r[1], "company": r[2], "description": r[3],
         "location": r[4], "job_type": r[5], "required_skills": r[6]}
        for r in rows
    ]}

@router.post("/jobs")
def create_recruiter_job(job: JobCreate, user=Depends(require_recruiter)):
    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO jobs
            (title, company, description, location, job_type, required_skills, recruiter_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id
            """,
            (job.title, job.company, job.description, job.location,
             job.job_type, job.required_skills, user["id"]),
        ).fetchone()
    return {"message": "Job created successfully", "job_id": row[0]}

@router.get("/jobs/{job_id}/candidates")
def recruiter_candidates(job_id: int, user=Depends(require_recruiter)):
    with get_connection() as conn:
        job = conn.execute(
            "SELECT required_skills FROM jobs WHERE id=%s AND recruiter_id=%s",
            (job_id, user["id"])
        ).fetchone()

        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        required = job[0] or []
        if isinstance(required, str):
            required = required.strip("{}").replace('"', '').split(",")
        required = {str(s).strip().lower() for s in required if str(s).strip()}

        rows = conn.execute(
            """
            SELECT sp.id, sp.full_name, sp.college, sp.degree, sp.cgpa,
                   COALESCE(
                     ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL),
                     ARRAY[]::varchar[]
                   ) AS skills
            FROM student_profiles sp
            LEFT JOIN student_skills ss ON ss.student_id = sp.id
            LEFT JOIN skills s ON s.id = ss.skill_id
            GROUP BY sp.id, sp.full_name, sp.college, sp.degree, sp.cgpa
            ORDER BY sp.full_name
            """
        ).fetchall()

    candidates = []
    for r in rows:
        skills = [str(s).strip() for s in (r[5] or []) if str(s).strip()]
        skill_map = {s.lower(): s for s in skills}
        matched = [skill_map[s] for s in required if s in skill_map]
        missing = [s for s in required if s not in skill_map]
        match = round((len(matched) / len(required)) * 100) if required else 0

        candidates.append({
            "student_id": r[0],
            "name": r[1],
            "college": r[2],
            "degree": r[3],
            "cgpa": float(r[4]) if r[4] is not None else None,
            "skills": skills,
            "matched_skills": matched,
            "missing_skills": missing,
            "match_percentage": match,
        })

    candidates.sort(key=lambda x: x["match_percentage"], reverse=True)
    return {"job_id": job_id, "candidates": candidates}

@router.get("/applications")
def recruiter_applications(user=Depends(require_recruiter)):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT a.id, sp.full_name, j.title, j.company,
                   a.status, a.applied_at
            FROM applications a
            JOIN student_profiles sp ON sp.id=a.student_id
            JOIN jobs j ON j.id=a.job_id
            WHERE j.recruiter_id=%s
            ORDER BY a.applied_at DESC
            """, (user["id"],)
        ).fetchall()
    return {"applications": [
        {"id":r[0],"student_name":r[1],"job_title":r[2],
         "company":r[3],"status":r[4],"applied_at":r[5]}
        for r in rows
    ]}

@router.patch("/applications/{application_id}/status")
def update_recruiter_application(application_id:int, update:dict, user=Depends(require_recruiter)):
    status=str(update.get("status","")).strip().lower()
    allowed={"shortlisted","interview","selected","rejected"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid recruiter status")

    with get_connection() as conn:
        row=conn.execute(
            """
            UPDATE applications a SET status=%s
            FROM jobs j
            WHERE a.id=%s AND a.job_id=j.id AND j.recruiter_id=%s
            RETURNING a.id,a.status
            """, (status,application_id,user["id"])
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message":"Application status updated","application":{"id":row[0],"status":row[1]}}
