from fastapi import APIRouter
from apps.api.db.connection import get_connection

router = APIRouter(prefix="/career", tags=["career"])


@router.get("/student/{student_id}")
def career_intelligence(student_id: int):
    with get_connection() as conn:
        student = conn.execute(
            """
            SELECT full_name, degree, graduation_year, cgpa
            FROM student_profiles
            WHERE id = %s
            """,
            (student_id,),
        ).fetchone()

        skills = conn.execute(
            """
            SELECT s.name
            FROM student_skills ss
            JOIN skills s ON s.id = ss.skill_id
            WHERE ss.student_id = %s
            ORDER BY s.name
            """,
            (student_id,),
        ).fetchall()

    if not student:
        return {"detail": "Student not found"}

    skill_names = [row[0] for row in skills]
    skill_set = {skill.lower() for skill in skill_names}

    career_paths = []

    if {"python", "sql"} <= skill_set:
        career_paths.append("Backend Developer")

    if {"python", "machine learning"} <= skill_set:
        career_paths.append("Machine Learning Engineer")

    if {"sql", "excel"} <= skill_set:
        career_paths.append("Data Analyst")

    if {"javascript", "react"} <= skill_set:
        career_paths.append("Frontend Developer")

    if not career_paths:
        career_paths.append("Software Developer")

    recommendations = []

    if "python" not in skill_set:
        recommendations.append("Learn Python")

    if "sql" not in skill_set:
        recommendations.append("Learn SQL")

    if "git" not in skill_set:
        recommendations.append("Strengthen Git and GitHub")

    if "react" not in skill_set:
        recommendations.append("Build a React project")

    return {
        "student": {
            "name": student[0],
            "degree": student[1],
            "graduation_year": student[2],
            "cgpa": student[3],
        },
        "current_skills": skill_names,
        "career_paths": career_paths,
        "recommendations": recommendations[:4],
    }
