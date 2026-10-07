from datetime import datetime, timedelta, timezone
from hashlib import sha256
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.enums import UserRole
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models import RefreshToken, User
from app.services.audit import write_audit

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    assigned_zone_id: str | None


class RefreshRequest(BaseModel):
    refresh_token: str


class MeResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    assigned_zone_id: str | None
    is_active: bool


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not user.is_active or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides.")
    if user.role_enum == UserRole.SELLER and user.assigned_zone_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte vendeuse sans zone assignée.",
        )
    tokens = _issue_tokens(db, user)
    write_audit(db, actor=user, action="auth.login", entity_type="user", entity_id=user.id)
    db.commit()
    return tokens


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        payload = decode_token(body.refresh_token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh invalide.") from exc
    if payload.get("typ") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh invalide.")
    token_hash = sha256(body.refresh_token.encode()).hexdigest()
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    now = datetime.now(timezone.utc)
    if stored is None or stored.revoked_at is not None or stored.expires_at < now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh révoqué ou expiré.")
    user = db.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Compte inactif.")
    stored.revoked_at = now
    tokens = _issue_tokens(db, user)
    db.commit()
    return tokens


@router.post("/logout")
def logout(
    body: RefreshRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    token_hash = sha256(body.refresh_token.encode()).hexdigest()
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash, RefreshToken.user_id == user.id))
    if stored is not None:
        stored.revoked_at = datetime.now(timezone.utc)
    write_audit(db, actor=user, action="auth.logout", entity_type="user", entity_id=user.id)
    db.commit()
    return {"ok": True}


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        assigned_zone_id=str(user.assigned_zone_id) if user.assigned_zone_id else None,
        is_active=user.is_active,
    )


def _issue_tokens(db: Session, user: User) -> TokenResponse:
    token_id = uuid4()
    refresh = create_refresh_token(user_id=user.id, token_id=token_id)
    db.add(
        RefreshToken(
            id=token_id,
            user_id=user.id,
            token_hash=sha256(refresh.encode()).hexdigest(),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_days),
        )
    )
    access = create_access_token(user_id=user.id, role=user.role_enum, zone_id=user.assigned_zone_id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        role=user.role,
        assigned_zone_id=str(user.assigned_zone_id) if user.assigned_zone_id else None,
    )
