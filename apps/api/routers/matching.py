from fastapi import APIRouter

from apps.api.db.connection import get_connection

router = APIRouter(prefix="/matching", tags=["matching"])


@router.get("/student/{student_id}/job/{job_id}")
def match_student_to_job(student_id: int, job_id: int):
    with get_connection() as conn:
        student_rows = conn.execute(
            """
            SELECT s.name
            FROM student_skills ss
            JOIN skills s ON s.id = ss.skill_id
            WHERE ss.student_id = %s
            """,
            (student_id,),
        ).fetchall()

        job_row = conn.execute(
            """
            SELECT title, company, required_skills
            FROM jobs
            WHERE id = %s
            """,
            (job_id,),
        ).fetchone()

    if not job_row:
        return {"error": "Job not found"}

    student_skill_map = {
    row[0].strip().lower(): row[0].strip()
    for row in student_rows
    }

    required_skill_map = {
    skill.strip().lower(): skill.strip()
    for skill in (job_row[2] or "").split(",")
    if skill.strip()
    }

    student_skills = set(student_skill_map)
    required_skills = set(required_skill_map)

    matched_skills = [
    student_skill_map[skill]
    for skill in sorted(student_skills & required_skills)
    ]

    missing_skills = [
    required_skill_map[skill]
    for skill in sorted(required_skills - student_skills)
    ]

    match_percentage = (
        round((len(matched_skills) / len(required_skills)) * 100)
        if required_skills
        else 0
        )

    return {
        "student_id": student_id,
        "job_id": job_id,
        "job_title": job_row[0],
        "company": job_row[1],
        "match_percentage": match_percentage,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
    }