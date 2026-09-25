from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import psycopg

from apps.api.routers.jobs import router as jobs_router
from apps.api.routers.students import router as students_router
from apps.api.routers.skills import router as skills_router
from apps.api.routers.applications import router as applications_router
from apps.api.routers.matching import router as matching_router
from apps.api.routers.resumes import router as resumes_router

load_dotenv("apps/api/.env")

app = FastAPI(title="Placement AI API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Placement AI API is running"}


@app.get("/health/db")
def database_health():
    conn = psycopg.connect(os.environ["DATABASE_URL"])
    conn.close()
    return {"database": "connected"}


app.include_router(jobs_router)
app.include_router(students_router)
app.include_router(skills_router)
app.include_router(applications_router)
app.include_router(matching_router)
app.include_router(resumes_router)
from apps.api.routers.career import router as career_router
app.include_router(career_router)

from apps.api.routers.analytics import router as analytics_router
app.include_router(analytics_router)

from apps.api.routers.auth import router as auth_router
from apps.api.routers.admin import router as admin_router
app.include_router(auth_router)
app.include_router(admin_router)


