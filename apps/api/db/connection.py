import os

import psycopg
from dotenv import load_dotenv

load_dotenv("apps/api/.env")


def get_connection():
    return psycopg.connect(os.environ["DATABASE_URL"])
