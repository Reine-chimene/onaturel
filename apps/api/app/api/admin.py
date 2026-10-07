from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import require_permission
from app.models import AuditLog, Setting, User
from app.services.audit import write_audit

audit_router = APIRouter(prefix="/audit", tags=["audit"])
settings_router = APIRouter(prefix="/settings", tags=["settings"])
commerce_router = APIRouter(tags=["commerce"])


class AuditOut(BaseModel):
    id: str
    actor_id: str | None
    action: str
    entity_type: str
    entity_id: str | None
    created_at: str


@audit_router.get("", response_model=list[AuditOut])
def list_audit(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("audit:read")),
    limit: int = 100,
) -> list[AuditOut]:
    rows = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)).all()
    return [
        AuditOut(
            id=str(item.id),
            actor_id=str(item.actor_id) if item.actor_id else None,
            action=item.action,
            entity_type=item.entity_type,
            entity_id=item.entity_id,
            created_at=item.created_at.isoformat(),
        )
        for item in rows
    ]


@settings_router.get("")
def get_settings(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("dashboard:access")),
) -> dict:
    rows = db.scalars(select(Setting)).all()
    return {item.key: item.value for item in rows}


class SettingPatch(BaseModel):
    key: str
    value: dict


@settings_router.patch("")
def patch_setting(
    body: SettingPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("settings:write")),
) -> dict:
    allowed = {"default_low_stock_threshold"}
    if body.key not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Paramètre non modifiable ici.")
    row = db.get(Setting, body.key)
    if row is None:
        row = Setting(key=body.key, value=body.value)
        db.add(row)
    else:
        row.value = body.value
    write_audit(db, actor=user, action="settings.update", entity_type="setting", entity_id=body.key, payload=body.value)
    db.commit()
    rows = db.scalars(select(Setting)).all()
    return {item.key: item.value for item in rows}


@commerce_router.get("/customers")
def list_customers(
    _: User = Depends(require_permission("orders:read")),
) -> list:
    return []


@commerce_router.get("/cash-closures")
def list_cash_closures(
    _: User = Depends(require_permission("cash:close")),
) -> list:
    return []


@commerce_router.get("/documents")
def list_documents(
    _: User = Depends(require_permission("documents:print")),
) -> list:
    return []
