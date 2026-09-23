from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from apps.api.db.connection import get_connection
from apps.api.security import get_current_user_id

router = APIRouter(prefix="/students", tags=["students"])


class StudentProfileUpdate(BaseModel):
    full_name: str
    phone: str | None = None
    college: str | None = None
    degree: str | None = None
    graduation_year: int | None = None
    cgpa: float | None = None


@router.get("/")
def get_students(current_user_id: int = Depends(get_current_user_id)):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, full_name, phone, college, degree, graduation_year, cgpa
            FROM student_profiles
            WHERE user_id = %s
            ORDER BY id
            """,
            (current_user_id,),
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


@router.get("/{student_id}")
def get_student(
    student_id: int,
    current_user_id: int = Depends(get_current_user_id),
):
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT id, full_name, phone, college, degree, graduation_year, cgpa
            FROM student_profiles
            WHERE id = %s AND user_id = %s
            """,
            (student_id, current_user_id),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Student not found")

    return {
        "id": row[0],
        "full_name": row[1],
        "phone": row[2],
        "college": row[3],
        "degree": row[4],
        "graduation_year": row[5],
        "cgpa": row[6],
    }


@router.put("/{student_id}")
def update_student(
    student_id: int,
    profile: StudentProfileUpdate,
    current_user_id: int = Depends(get_current_user_id),
):
    with get_connection() as conn:
        row = conn.execute(
            """
            UPDATE student_profiles
            SET full_name = %s,
                phone = %s,
                college = %s,
                degree = %s,
                graduation_year = %s,
                cgpa = %s
            WHERE id = %s AND user_id = %s
            RETURNING id, full_name, phone, college, degree, graduation_year, cgpa
            """,
            (
                profile.full_name,
                profile.phone,
                profile.college,
                profile.degree,
                profile.graduation_year,
                profile.cgpa,
                student_id,
                current_user_id,
            ),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Student not found")

    return {
        "message": "Profile updated successfully",
        "student": {
            "id": row[0],
            "full_name": row[1],
            "phone": row[2],
            "college": row[3],
            "degree": row[4],
            "graduation_year": row[5],
            "cgpa": row[6],
        },
    }


@router.get("/{student_id}/skills")
def get_student_skills(
    student_id: int,
    current_user_id: int = Depends(get_current_user_id),
):
    with get_connection() as conn:
        owner = conn.execute(
            """
            SELECT id
            FROM student_profiles
            WHERE id = %s AND user_id = %s
            """,
            (student_id, current_user_id),
        ).fetchone()

        if not owner:
            raise HTTPException(status_code=404, detail="Student not found")

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
