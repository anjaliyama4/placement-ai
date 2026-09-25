from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

from apps.api.db.connection import get_connection

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = "placement-ai-development-secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    college: str | None = None
    degree: str | None = None
    graduation_year: int | None = None
    cgpa: float | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user_id: int, role: str = "student") -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expires_at,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/register")
def register(request: RegisterRequest):
    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    with get_connection() as conn:
        existing_user = conn.execute(
            "SELECT id FROM users WHERE email = %s",
            (request.email,),
        ).fetchone()

        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        password_hash = hash_password(request.password)

        user = conn.execute(
            """
            INSERT INTO users (email, password_hash, role)
            VALUES (%s, %s, 'student')
            RETURNING id, role
            """,
            (request.email, password_hash),
        ).fetchone()

        student = conn.execute(
            """
            INSERT INTO student_profiles
                (user_id, full_name, college, degree, graduation_year, cgpa)
            VALUES
                (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                user[0],
                request.full_name,
                request.college,
                request.degree,
                request.graduation_year,
                request.cgpa,
            ),
        ).fetchone()

    access_token = create_access_token(user[0], user[1])

    return {
        "message": "Registration successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user[0],
            "student_id": student[0],
            "email": request.email,
            "full_name": request.full_name,
            "role": user[1],
        },
    }


@router.post("/login")
def login(request: LoginRequest):
    with get_connection() as conn:
        user = conn.execute(
            """
            SELECT id, email, password_hash, role
            FROM users
            WHERE email = %s
            """,
            (request.email,),
        ).fetchone()

        if not user or not verify_password(request.password, user[2]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        student = conn.execute(
            """
            SELECT id, full_name
            FROM student_profiles
            WHERE user_id = %s
            """,
            (user[0],),
        ).fetchone()

    access_token = create_access_token(user[0], user[3])

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user[0],
            "student_id": student[0] if student else None,
            "email": user[1],
            "full_name": student[1] if student else None,
            "role": user[3],
        },
    }
