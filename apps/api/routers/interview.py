from fastapi import APIRouter, Depends
from apps.api.db.connection import get_connection
from apps.api.security import get_current_user_id

router = APIRouter(prefix="/interview", tags=["interview"])

@router.get("/student/{student_id}")
def get_interview_questions(student_id: int, user_id: int = Depends(get_current_user_id)):
    with get_connection() as conn:
        owner = conn.execute(
            "SELECT id FROM student_profiles WHERE id=%s AND user_id=%s",
            (student_id, user_id),
        ).fetchone()

        if not owner:
            return {"error": "Student not found"}

        skills = conn.execute(
            """
            SELECT s.name
            FROM student_skills ss
            JOIN skills s ON s.id=ss.skill_id
            WHERE ss.student_id=%s
            ORDER BY s.name
            """,
            (student_id,),
        ).fetchall()

    skill_names = [row[0] for row in skills]

    questions = []
    for skill in skill_names[:8]:
        questions.append({
            "skill": skill,
            "question": f"Explain your experience with {skill} and describe one project where you used it.",
            "type": "technical",
        })

    questions.extend([
        {
            "skill": "Projects",
            "question": "Tell me about your most important technical project and your specific contribution.",
            "type": "project",
        },
        {
            "skill": "Problem Solving",
            "question": "Describe a difficult technical problem you faced and how you solved it.",
            "type": "behavioral",
        },
        {
            "skill": "Career",
            "question": "Why are you interested in this role, and what do you want to learn from it?",
            "type": "behavioral",
        },
    ])

    return {"student_id": student_id, "questions": questions}
