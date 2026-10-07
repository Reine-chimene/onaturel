from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import assert_zone_scope, require_permission
from app.models import InventoryMovement, InventoryPosition, User
from app.services.inventory import (
    default_low_stock_threshold,
    get_or_create_position,
    stock_status,
    total_qty,
    transfer_between_zones,
)
from app.services.catalog_admin import set_zone_qty
from app.services.audit import write_audit

router = APIRouter(prefix="/inventory", tags=["inventory"])


class PositionOut(BaseModel):
    id: str
    product_id: str
    zone_id: str
    qty: int
    total_qty: int | None
    stock_status: str


class MovementOut(BaseModel):
    id: str
    product_id: str
    zone_id: str
    qty_delta: int
    reason: str
    reference_type: str | None
    created_at: str


class TransferRequest(BaseModel):
    product_id: UUID
    from_zone_id: UUID
    to_zone_id: UUID
    quantity: int
    note: str | None = None


class AdjustRequest(BaseModel):
    product_id: UUID
    zone_id: UUID
    qty: int
    note: str | None = None


class ThresholdRequest(BaseModel):
    product_id: UUID
    zone_id: UUID
    low_stock_threshold: int | None


@router.get("/positions", response_model=list[PositionOut])
def list_positions(
    zone_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("inventory:read")),
) -> list[PositionOut]:
    stmt = select(InventoryPosition)
    if zone_id is not None:
        assert_zone_scope(user, zone_id)
        stmt = stmt.where(InventoryPosition.zone_id == zone_id)
    elif user.role == "SELLER" and user.assigned_zone_id is not None:
        stmt = stmt.where(InventoryPosition.zone_id == user.assigned_zone_id)
    rows = db.scalars(stmt).all()
    threshold = default_low_stock_threshold(db)
    show_total = user.role in {"OWNER", "ADMIN"}
    return [
        PositionOut(
            id=str(item.id),
            product_id=str(item.product_id),
            zone_id=str(item.zone_id),
            qty=item.qty,
            total_qty=total_qty(db, item.product_id) if show_total else None,
            stock_status=stock_status(item.qty, item.low_stock_threshold or threshold).value,
        )
        for item in rows
    ]


@router.get("/movements", response_model=list[MovementOut])
def list_movements(
    zone_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("inventory:read")),
    limit: int = 100,
) -> list[MovementOut]:
    stmt = select(InventoryMovement).order_by(InventoryMovement.created_at.desc()).limit(limit)
    if zone_id is not None:
        assert_zone_scope(user, zone_id)
        stmt = stmt.where(InventoryMovement.zone_id == zone_id)
    elif user.role == "SELLER" and user.assigned_zone_id is not None:
        stmt = stmt.where(InventoryMovement.zone_id == user.assigned_zone_id)
    rows = db.scalars(stmt).all()
    return [
        MovementOut(
            id=str(item.id),
            product_id=str(item.product_id),
            zone_id=str(item.zone_id),
            qty_delta=item.qty_delta,
            reason=item.reason,
            reference_type=item.reference_type,
            created_at=item.created_at.isoformat(),
        )
        for item in rows
    ]


@router.post("/transfers")
def transfer(
    body: TransferRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("inventory:write")),
) -> dict:
    group_id = transfer_between_zones(
        db,
        product_id=body.product_id,
        from_zone_id=body.from_zone_id,
        to_zone_id=body.to_zone_id,
        quantity=body.quantity,
        actor_id=user.id,
        note=body.note,
    )
    write_audit(
        db,
        actor=user,
        action="inventory.transfer",
        entity_type="inventory_movement",
        entity_id=group_id,
        payload=body.model_dump(mode="json"),
    )
    db.commit()
    return {"transfer_group_id": str(group_id)}


@router.post("/adjust")
def adjust_stock(
    body: AdjustRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("inventory:write")),
) -> dict:
    position = set_zone_qty(
        db,
        product_id=body.product_id,
        zone_id=body.zone_id,
        qty=body.qty,
        actor_id=user.id,
        note=body.note,
    )
    write_audit(
        db,
        actor=user,
        action="inventory.adjust",
        entity_type="inventory_position",
        entity_id=position.id,
        payload=body.model_dump(mode="json"),
    )
    db.commit()
    threshold = default_low_stock_threshold(db)
    return {
        "product_id": str(position.product_id),
        "zone_id": str(position.zone_id),
        "qty": position.qty,
        "stock_status": stock_status(position.qty, position.low_stock_threshold or threshold).value,
    }


@router.patch("/threshold")
def set_threshold(
    body: ThresholdRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("inventory:write")),
) -> dict:
    position = get_or_create_position(db, body.product_id, body.zone_id)
    position.low_stock_threshold = body.low_stock_threshold
    write_audit(db, actor=user, action="inventory.threshold", entity_type="inventory_position", entity_id=position.id)
    db.commit()
    return {
        "product_id": str(position.product_id),
        "zone_id": str(position.zone_id),
        "low_stock_threshold": position.low_stock_threshold,
    }
