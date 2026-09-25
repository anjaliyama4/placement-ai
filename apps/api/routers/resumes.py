from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pypdf import PdfReader

from apps.api.db.connection import get_connection
from apps.api.security import get_current_user_id

router = APIRouter(prefix="/resumes", tags=["resumes"])

UPLOAD_DIR = Path("apps/api/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

KNOWN_SKILLS = [
    "Python", "SQL", "Git", "FastAPI", "Excel", "Java", "JavaScript",
    "TypeScript", "React", "Next.js", "Node.js", "C++", "C#", "AWS",
    "Docker", "PostgreSQL", "MongoDB",
]



@router.get("/student/{student_id}/history")
def resume_history(student_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_connection() as conn:
        owner = conn.execute(
            "SELECT user_id FROM student_profiles WHERE id=%s",
            (student_id,),
        ).fetchone()

        if not owner or owner[0] != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        rows = conn.execute(
            """
            SELECT id, file_path, created_at
            FROM resumes
            WHERE student_id=%s
            ORDER BY created_at DESC
            """,
            (student_id,),
        ).fetchall()

    return {
        "resumes": [
            {
                "id": row[0],
                "filename": Path(str(row[1])).name if row[1] else f"Resume #{row[0]}",
                "uploaded_at": row[2].isoformat() if row[2] else None,
            }
            for row in rows
        ]
    }

@router.post("/student/{student_id}")
async def upload_resume(
    student_id: int,
    file: UploadFile = File(...),
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

    safe_name = Path(file.filename or "resume").name
    file_path = UPLOAD_DIR / safe_name

    contents = await file.read()
    file_path.write_bytes(contents)

    if safe_name.lower().endswith(".pdf"):
        reader = PdfReader(str(file_path))
        extracted_text = "\n".join(
            page.extract_text() or "" for page in reader.pages
        )
    else:
        extracted_text = contents.decode("utf-8", errors="ignore")

    detected_skills = [
        skill for skill in KNOWN_SKILLS
        if skill.lower() in extracted_text.lower()
    ]

    added_skills = []
    existing_skills = []

    with get_connection() as conn:
        for skill_name in detected_skills:
            skill_row = conn.execute(
                "SELECT id FROM skills WHERE LOWER(name) = LOWER(%s)",
                (skill_name,),
            ).fetchone()

            if skill_row:
                skill_id = skill_row[0]
            else:
                skill_id = conn.execute(
                    """
                    INSERT INTO skills (name)
                    VALUES (%s)
                    RETURNING id
                    """,
                    (skill_name,),
                ).fetchone()[0]

            existing_row = conn.execute(
                """
                SELECT 1 FROM student_skills
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

        resume_id = conn.execute(
            """
            INSERT INTO resumes (student_id, file_name, file_path)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (student_id, safe_name, str(file_path)),
        ).fetchone()[0]

    return {
        "message": "Resume uploaded and analyzed successfully",
        "resume_id": resume_id,
        "file_name": safe_name,
        "detected_skills": detected_skills,
        "added_skills": added_skills,
        "already_present": existing_skills,
    }

@router.get("/student/{student_id}/score")
def resume_score(student_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_connection() as conn:
        owner = conn.execute(
            "SELECT id FROM student_profiles WHERE id=%s AND user_id=%s",
            (student_id, current_user_id),
        ).fetchone()

        if not owner:
            raise HTTPException(status_code=404, detail="Student not found")

        resume = conn.execute(
            "SELECT id, file_name, file_path FROM resumes WHERE student_id=%s ORDER BY id DESC LIMIT 1",
            (student_id,),
        ).fetchone()

        profile = conn.execute(
            "SELECT full_name, phone, college, degree, graduation_year, cgpa FROM student_profiles WHERE id=%s",
            (student_id,),
        ).fetchone()

    if not resume:
        return {"score": 0, "message": "Upload a resume first", "breakdown": {}}

    path = Path(resume[2])
    text = ""

    if path.exists():
        try:
            if path.suffix.lower() == ".pdf":
                text = "\n".join(
                    page.extract_text() or "" for page in PdfReader(str(path)).pages
                )
            else:
                text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            text = ""

    normalized_text = text.lower()

    resume_skills = []
    for skill in KNOWN_SKILLS:
        if skill.lower() in normalized_text:
            resume_skills.append(skill)

    skill_count = len(resume_skills)

    profile_fields = sum(
        1 for value in profile if value not in (None, "")
    ) if profile else 0

    profile_score = min(20, round((profile_fields / 6) * 20))

    skill_score = min(40, skill_count * 5)

    word_count = len(text.split())

    section_keywords = {
        "education": ["education", "academic"],
        "experience": ["experience", "work experience", "internship"],
        "projects": ["projects", "project"],
        "skills": ["skills", "technical skills"],
        "summary": ["summary", "objective", "profile"],
    }

    detected_sections = []
    for section, keywords in section_keywords.items():
        if any(keyword in normalized_text for keyword in keywords):
            detected_sections.append(section)

    length_score = (
        20 if word_count >= 500
        else 16 if word_count >= 350
        else 12 if word_count >= 200
        else 8 if word_count >= 100
        else 4 if word_count > 0
        else 0
    )

    section_score = min(20, len(detected_sections) * 4)

    content_score = min(40, length_score + section_score)

    total = min(100, profile_score + skill_score + content_score)

    recommendations = []

    if skill_count < 6:
        recommendations.append(
            "Add more relevant technical skills from the target job descriptions"
        )
    else:
        recommendations.append("Technical skills section is well covered")

    if "projects" not in detected_sections:
        recommendations.append("Add a projects section with measurable technical contributions")

    if "experience" not in detected_sections:
        recommendations.append("Add internship or work experience if available")

    if "education" not in detected_sections:
        recommendations.append("Add a clear education section")

    if "summary" not in detected_sections:
        recommendations.append("Consider adding a short professional summary")

    if profile_score < 20:
        recommendations.append("Complete your profile details")
    else:
        recommendations.append("Profile details are complete")

    return {
        "score": total,
        "resume_id": resume[0],
        "file_name": resume[1],
        "breakdown": {
            "skills": skill_score,
            "profile": profile_score,
            "content": content_score,
        },
        "skill_count": skill_count,
        "detected_skills": resume_skills,
        "detected_sections": detected_sections,
        "word_count": word_count,
        "recommendations": recommendations,
    }
