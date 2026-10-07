from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.enums import UserRole
from app.core.rbac import Permission, has_permission
from app.core.security import decode_token, is_owner_role
from app.models import User

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise.")
    try:
        payload = decode_token(creds.credentials)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Jeton invalide.") from exc
    if payload.get("typ") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Jeton d'accès requis.")
    user = db.get(User, UUID(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Compte inactif.")
    return user


def require_permission(permission: Permission):
    def checker(user: User = Depends(get_current_user)) -> User:
        if not has_permission(user.role_enum, permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission insuffisante.")
        return user

    return checker


def require_owner(user: User = Depends(get_current_user)) -> User:
    if not is_owner_role(user.role_enum):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cet espace est réservé à la propriétaire.",
        )
    return user


def assert_zone_scope(user: User, zone_id: UUID) -> None:
    if is_owner_role(user.role_enum):
        return
    if user.role_enum == UserRole.SELLER:
        if user.assigned_zone_id is None or user.assigned_zone_id != zone_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La vendeuse ne peut travailler que dans sa zone assignée.",
            )
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rôle non autorisé.")


def seller_zone_id(user: User) -> UUID:
    if is_owner_role(user.role_enum):
        if user.assigned_zone_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Zone requise pour cette opération.",
            )
        return user.assigned_zone_id
    if user.assigned_zone_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aucune zone n'est assignée à ce compte vendeuse.",
        )
    return user.assigned_zone_id
