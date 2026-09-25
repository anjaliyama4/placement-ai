from fastapi import APIRouter, Query

from apps.api.db.connection import get_connection

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/")
def get_jobs(
    search: str | None = Query(default=None),
    location: str | None = Query(default=None),
    job_type: str | None = Query(default=None),
):
    with get_connection() as conn:
        conditions = []
        params = []

        if search:
            conditions.append(
                "(LOWER(title) LIKE LOWER(%s) OR LOWER(company) LIKE LOWER(%s) "
                "OR LOWER(description) LIKE LOWER(%s))"
            )
            term = f"%{search}%"
            params.extend([term, term, term])

        if location:
            conditions.append("LOWER(location) = LOWER(%s)")
            params.append(location)

        if job_type:
            conditions.append("LOWER(job_type) = LOWER(%s)")
            params.append(job_type)

        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)

        rows = conn.execute(
            f"""
            SELECT id, title, company, description, location, job_type, required_skills
            FROM jobs
            {where_clause}
            ORDER BY created_at DESC
            """,
            params,
        ).fetchall()

    jobs = [
        {
            "id": row[0],
            "title": row[1],
            "company": row[2],
            "description": row[3],
            "location": row[4],
            "job_type": row[5],
            "required_skills": [s.strip().strip('{}"') for s in (row[6] if isinstance(row[6], (list, tuple)) else str(row[6] or "").replace("{","").replace("}","").replace('""','').split(",")) if s.strip().strip('{}"')],
        }
        for row in rows
    ]

    return {"jobs": jobs}




