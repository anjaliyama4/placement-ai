from fastapi import FastAPI
from dotenv import load_dotenv
import os
import psycopg

from apps.api.routers.jobs import router as jobs_router
from apps.api.routers.students import router as students_router
from apps.api.routers.skills import router as skills_router
from apps.api.routers.applications import router as applications_router

load_dotenv("apps/api/.env")

app = FastAPI(title="Placement AI API")


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