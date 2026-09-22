from fastapi import APIRouter

from apps.api.db.connection import get_connection

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/")
def get_students():
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, full_name, phone, college, degree, graduation_year, cgpa
            FROM student_profiles
            ORDER BY id
            """
        ).fetchall()

    students = [
        {
            "id": row[0],
            "full_name": row[1],
            "phone": row[2],
            "college": row[3],
            "degree": row[4],
            "graduation_year": row[5],
            "cgpa": row[6],
        }
        for row in rows
    ]

    return {"students": students}


@router.get("/{student_id}/skills")
def get_student_skills(student_id: int):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT s.id, s.name, ss.proficiency
            FROM student_skills ss
            JOIN skills s ON s.id = ss.skill_id
            WHERE ss.student_id = %s
            ORDER BY s.name
            """,
            (student_id,),
        ).fetchall()

    skills = [
        {
            "id": row[0],
            "name": row[1],
            "proficiency": row[2],
        }
        for row in rows
    ]

    return {"student_id": student_id, "skills": skills}
