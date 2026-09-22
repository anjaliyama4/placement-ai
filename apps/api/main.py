from fastapi import FastAPI
from dotenv import load_dotenv
import os
import psycopg

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
