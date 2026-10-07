from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import require_permission
from app.core.enums import UserRole
from app.core.security import hash_password, is_owner_role
from app.models import CommercialZone, User
from app.services.audit import write_audit

router = APIRouter(prefix="/users", tags=["users"])


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    assigned_zone_id: str | None
    is_active: bool


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole
    assigned_zone_id: UUID | None = None


class AssignZoneRequest(BaseModel):
    assigned_zone_id: UUID


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("users:read")),
) -> list[UserOut]:
    rows = db.scalars(select(User).order_by(User.created_at)).all()
    return [_to_out(item) for item in rows]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    body: CreateUserRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("users:write")),
) -> UserOut:
    existing = db.scalar(select(User).where(User.email == body.email.lower()))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email déjà utilisé.")
    assigned = body.assigned_zone_id
    if body.role == UserRole.SELLER:
        if assigned is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Une vendeuse doit être rattachée à une zone.",
            )
        if db.get(CommercialZone, assigned) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone introuvable.")
    if is_owner_role(body.role):
        assigned = None
    user = User(
        email=body.email.lower(),
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role.value,
        assigned_zone_id=assigned,
        is_active=True,
    )
    db.add(user)
    db.flush()
    write_audit(
        db,
        actor=actor,
        action="user.create",
        entity_type="user",
        entity_id=user.id,
        payload={"email": user.email, "role": user.role, "assigned_zone_id": str(assigned) if assigned else None},
    )
    db.commit()
    db.refresh(user)
    return _to_out(user)


@router.patch("/{user_id}/zone", response_model=UserOut)
def assign_zone(
    user_id: UUID,
    body: AssignZoneRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("users:write")),
) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
    if user.role_enum != UserRole.SELLER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seule une vendeuse est rattachée à une zone.",
        )
    if db.get(CommercialZone, body.assigned_zone_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone introuvable.")
    user.assigned_zone_id = body.assigned_zone_id
    write_audit(
        db,
        actor=actor,
        action="user.assign_zone",
        entity_type="user",
        entity_id=user.id,
        payload={"assigned_zone_id": str(body.assigned_zone_id)},
    )
    db.commit()
    db.refresh(user)
    return _to_out(user)


def _to_out(user: User) -> UserOut:
    return UserOut(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        assigned_zone_id=str(user.assigned_zone_id) if user.assigned_zone_id else None,
        is_active=user.is_active,
    )
