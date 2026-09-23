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

    # Career readiness score
    readiness_score = 0

    if len(skill_names) >= 3:
        readiness_score += 25

    if len(skill_names) >= 5:
        readiness_score += 15

    if "python" in skill_set:
        readiness_score += 15

    if "sql" in skill_set:
        readiness_score += 15

    if "git" in skill_set:
        readiness_score += 10

    if "javascript" in skill_set or "react" in skill_set:
        readiness_score += 10

    if student[3] is not None and float(student[3]) >= 7.0:
        readiness_score += 10

    readiness_score = min(readiness_score, 100)

    if readiness_score >= 80:
        readiness_level = "Highly Ready"
    elif readiness_score >= 60:
        readiness_level = "Career Ready"
    elif readiness_score >= 40:
        readiness_level = "Developing"
    else:
        readiness_level = "Getting Started"

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
        "readiness_score": readiness_score,
        "readiness_level": readiness_level,
    }