"""Authentication endpoints: register, login, me."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.database import async_session, get_db
from app.models.organization import Organization
from app.models.user import User
from app.models.anonymous_session import AnonymousSession
from app.models.receivable import Receivable
from app.models.payment import Payment

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


# --- Schemas ---

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    session_token: str | None = None  # to link anonymous session data


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    organization_id: str
    plan: str


# --- Helpers ---

def create_token(user_id: str, org_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expiration_minutes)
    payload = {
        "sub": user_id,
        "org": org_id,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    async with async_session() as db:
        result = await db.execute(select(User).where(User.id == payload["sub"]))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user


# --- Endpoints ---

@router.post("/register")
async def register(req: RegisterRequest):
    """Register a new user + organization. Optionally link anonymous session data."""
    async with async_session() as db:
        # Check if email already exists
        existing = await db.execute(select(User).where(User.email == req.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email já cadastrado")

        # Create organization
        trial_expires = datetime.now(timezone.utc) + timedelta(days=30)
        org = Organization(
            name=req.name,
            plan="trial",
            trial_expires_at=trial_expires,
        )
        db.add(org)
        await db.flush()

        # Create user
        user = User(
            organization_id=org.id,
            email=req.email,
            password_hash=pwd_context.hash(req.password),
            role="admin",
        )
        db.add(user)
        await db.flush()

        # Link anonymous session data if provided
        linked_receivables = 0
        linked_payments = 0
        if req.session_token:
            sess_result = await db.execute(
                select(AnonymousSession).where(
                    AnonymousSession.session_token == req.session_token
                )
            )
            anon_session = sess_result.scalar_one_or_none()
            if anon_session:
                # Transfer receivables
                recv_result = await db.execute(
                    select(Receivable).where(Receivable.session_id == anon_session.id)
                )
                for r in recv_result.scalars().all():
                    r.organization_id = org.id
                    linked_receivables += 1

                # Transfer payments
                pay_result = await db.execute(
                    select(Payment).where(Payment.session_id == anon_session.id)
                )
                for p in pay_result.scalars().all():
                    p.organization_id = org.id
                    linked_payments += 1

                # Mark session as converted
                anon_session.converted_to_org_id = org.id

        await db.commit()

    token = create_token(user.id, org.id)

    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": org.name,
            "organization_id": org.id,
            "plan": org.plan,
        },
        "linked_data": {
            "receivables": linked_receivables,
            "payments": linked_payments,
        },
    }


@router.post("/login")
async def login(req: LoginRequest):
    """Login with email + password."""
    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == req.email))
        user = result.scalar_one_or_none()

        if not user or not pwd_context.verify(req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")

        # Get organization
        org_result = await db.execute(
            select(Organization).where(Organization.id == user.organization_id)
        )
        org = org_result.scalar_one()

    token = create_token(user.id, org.id)

    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": org.name,
            "organization_id": org.id,
            "plan": org.plan,
        },
    }


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    """Get current user info."""
    async with async_session() as db:
        org_result = await db.execute(
            select(Organization).where(Organization.id == user.organization_id)
        )
        org = org_result.scalar_one()

    return {
        "id": user.id,
        "email": user.email,
        "name": org.name,
        "organization_id": org.id,
        "plan": org.plan,
    }
