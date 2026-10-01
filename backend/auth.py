from datetime import datetime, timedelta, timezone
from typing import Callable, Literal
import hashlib
import secrets
import jwt

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User

SECRET_KEY = "conference-demo-secret-change-before-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

router = APIRouter(prefix="/auth", tags=["Authentication"])
user_directory_router = APIRouter(tags=["Users"])
security = HTTPBearer()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, digest = stored_hash.split("$", 1)
        calculated = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
        return secrets.compare_digest(calculated, digest)
    except ValueError:
        return False


def create_access_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "role": role, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = "participant"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Literal["organizer", "participant", "author", "reviewer", "speaker"] | None = None


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    password: str | None = None


@router.post("/register", status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    allowed_roles = {"participant", "author", "reviewer", "speaker"}
    if data.role not in allowed_roles:
        raise HTTPException(400, "Invalid role")
    if db.query(User).filter((User.email == data.email) | (User.username == data.name)).first():
        raise HTTPException(400, "Email or name already registered")

    user = User(username=data.name.strip(), email=str(data.email).lower(), password=hash_password(data.password), role=data.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User registered successfully", "user_id": user.id, "name": user.name, "email": user.email, "role": user.role}


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if data.role is not None and user.role != data.role:
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"This account is registered as a {user.role}. Select that role to continue.")
    if not user.is_active:
        raise HTTPException(403, "User account is inactive")
    return {"access_token": create_access_token(user.id, user.role), "token_type": "bearer", "user_id": user.id, "role": user.role}


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(401, "Invalid token")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(401, "User not found")
        if not user.is_active:
            raise HTTPException(403, "User account is inactive")
        return user
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError):
        raise HTTPException(401, "Invalid or expired token")


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email, "role": current_user.role, "is_active": current_user.is_active}


def require_role(*allowed_roles: str) -> Callable:
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(403, "You do not have permission")
        return current_user
    return role_checker


@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }


@router.patch("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.name is not None:
        cleaned_name = payload.name.strip()
        if len(cleaned_name) < 2:
            raise HTTPException(400, "Name must be at least 2 characters long")
        if db.query(User).filter(User.username == cleaned_name, User.id != current_user.id).first():
            raise HTTPException(400, "A user with this name already exists")
        current_user.username = cleaned_name

    if payload.email is not None:
        normalized_email = str(payload.email).lower()
        if db.query(User).filter(User.email == normalized_email, User.id != current_user.id).first():
            raise HTTPException(400, "A user with this email already exists")
        current_user.email = normalized_email

    if payload.password is not None:
        if len(payload.password.strip()) < 6:
            raise HTTPException(400, "Password must be at least 6 characters long")
        current_user.password = hash_password(payload.password)

    db.commit(); db.refresh(current_user)
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email, "role": current_user.role, "is_active": current_user.is_active}


@user_directory_router.get("/users/reviewers")
def list_reviewers(db: Session = Depends(get_db), current_user: User = Depends(require_role("organizer"))):
    reviewers = db.query(User).filter(User.role == "reviewer").order_by(User.id).all()
    return [{"id": user.id, "name": user.name, "email": user.email, "role": user.role, "is_active": user.is_active} for user in reviewers]


@user_directory_router.get("/users/speakers")
def list_speakers(db: Session = Depends(get_db), current_user: User = Depends(require_role("organizer"))):
    speakers = db.query(User).filter(User.role == "speaker").order_by(User.id).all()
    return [{"id": user.id, "name": user.name, "email": user.email, "role": user.role, "is_active": user.is_active} for user in speakers]
