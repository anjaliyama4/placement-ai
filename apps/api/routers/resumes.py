from pathlib import Path

from fastapi import APIRouter, File, UploadFile
from pypdf import PdfReader

from apps.api.db.connection import get_connection

router = APIRouter(prefix="/resumes", tags=["resumes"])

UPLOAD_DIR = Path("apps/api/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


KNOWN_SKILLS = [
    "Python",
    "SQL",
    "Git",
    "FastAPI",
    "Excel",
    "Java",
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "C++",
    "C#",
    "AWS",
    "Docker",
    "PostgreSQL",
    "MongoDB",
]


@router.post("/student/{student_id}")
async def upload_resume(
    student_id: int,
    file: UploadFile = File(...),
):
    file_path = UPLOAD_DIR / file.filename

    contents = await file.read()
    file_path.write_bytes(contents)

    extracted_text = ""

    if file.filename.lower().endswith(".pdf"):
        reader = PdfReader(str(file_path))

        extracted_text = "\n".join(
            page.extract_text() or ""
            for page in reader.pages
        )
    else:
        extracted_text = contents.decode("utf-8", errors="ignore")

    detected_skills = [
        skill
        for skill in KNOWN_SKILLS
        if skill.lower() in extracted_text.lower()
    ]

    added_skills = []
    existing_skills = []

    with get_connection() as conn:
        for skill_name in detected_skills:
            skill_row = conn.execute(
                """
                SELECT id
                FROM skills
                WHERE LOWER(name) = LOWER(%s)
                """,
                (skill_name,),
            ).fetchone()

            if skill_row:
                skill_id = skill_row[0]
            else:
                skill_row = conn.execute(
                    """
                    INSERT INTO skills (name)
                    VALUES (%s)
                    RETURNING id
                    """,
                    (skill_name,),
                ).fetchone()

                skill_id = skill_row[0]

            existing_row = conn.execute(
                """
                SELECT 1
                FROM student_skills
                WHERE student_id = %s AND skill_id = %s
                """,
                (student_id, skill_id),
            ).fetchone()

            if existing_row:
                existing_skills.append(skill_name)
            else:
                conn.execute(
                    """
                    INSERT INTO student_skills
                    (student_id, skill_id, proficiency)
                    VALUES (%s, %s, %s)
                    """,
                    (student_id, skill_id, "Beginner"),
                )

                added_skills.append(skill_name)

        row = conn.execute(
            """
            INSERT INTO resumes (student_id, file_name, file_path)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (student_id, file.filename, str(file_path)),
        ).fetchone()

    return {
        "message": "Resume uploaded and analyzed successfully",
        "resume_id": row[0],
        "file_name": file.filename,
        "detected_skills": detected_skills,
        "added_skills": added_skills,
        "already_present": existing_skills,
    }