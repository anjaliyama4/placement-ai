from fastapi import APIRouter

from apps.api.db.connection import get_connection

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("/")
def get_skills():
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
