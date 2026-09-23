from fastapi import APIRouter, Depends
from pydantic import BaseModel

from apps.api.db.connection import get_connection
from apps.api.security import get_current_user_id

router = APIRouter(prefix="/skills", tags=["skills"])


class StudentSkillRequest(BaseModel):
    skill_id: int
    proficiency: str = "Beginner"


@router.get("/")
def get_skills(
    current_user_id: int = Depends(get_current_user_id),
):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, name
            FROM skills
            ORDER BY name
            """
        ).fetchall()

    skills = [
        {
            "id": row[0],
            "name": row[1],
        }
        for row in rows
    ]

    return {"skills": skills}


@router.get("/student/{student_id}")
def get_student_skills(
    student_id: int,
    current_user_id: int = Depends(get_current_user_id),
):
    with get_connection() as conn:
        owner = conn.execute(
            """
            SELECT id
            FROM student_profiles
            WHERE id = %s
              AND user_id = %s
            """,
            (student_id, current_user_id),
        ).fetchone()

        if not owner:
            return {
                "student_id": student_id,
                "skills": [],
            }

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

    return {
        "student_id": student_id,
        "skills": skills,
    }


@router.post("/student/{student_id}")
def add_student_skill(
    student_id: int,
    skill: StudentSkillRequest,
    current_user_id: int = Depends(get_current_user_id),
):
    with get_connection() as conn:
        owner = conn.execute(
            """
            SELECT id
            FROM student_profiles
            WHERE id = %s
              AND user_id = %s
            """,
            (student_id, current_user_id),
        ).fetchone()

        if not owner:
            return {
                "message": "Student not found",
                "student_id": student_id,
            }

        conn.execute(
            """
            INSERT INTO student_skills (student_id, skill_id, proficiency)
            VALUES (%s, %s, %s)
            ON CONFLICT (student_id, skill_id)
            DO UPDATE SET proficiency = EXCLUDED.proficiency
            """,
            (student_id, skill.skill_id, skill.proficiency),
        )

    return {
        "message": "Skill added successfully",
        "student_id": student_id,
        "skill_id": skill.skill_id,
        "proficiency": skill.proficiency,
    }
