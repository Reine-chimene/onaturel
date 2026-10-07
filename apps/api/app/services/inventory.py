from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import MovementReason, StockStatus
from app.models import InventoryMovement, InventoryPosition, Setting


def default_low_stock_threshold(db: Session) -> int:
    row = db.get(Setting, "default_low_stock_threshold")
    if row is None:
        return 5
    return int(row.value.get("value", 5))


def stock_status(qty: int, threshold: int) -> StockStatus:
    if qty <= 0:
        return StockStatus.OUT_OF_STOCK
    if qty <= threshold:
        return StockStatus.LOW_STOCK
    return StockStatus.IN_STOCK


def get_or_create_position(db: Session, product_id: UUID, zone_id: UUID) -> InventoryPosition:
    position = db.scalar(
        select(InventoryPosition).where(
            InventoryPosition.product_id == product_id,
            InventoryPosition.zone_id == zone_id,
        )
    )
    if position is None:
        position = InventoryPosition(product_id=product_id, zone_id=zone_id, qty=0)
        db.add(position)
        db.flush()
    return position


def apply_movement(
    db: Session,
    *,
    product_id: UUID,
    zone_id: UUID,
    qty_delta: int,
    reason: MovementReason,
    actor_id: UUID | None = None,
    reference_type: str | None = None,
    reference_id: str | None = None,
    transfer_group_id: UUID | None = None,
    note: str | None = None,
) -> InventoryPosition:
    position = get_or_create_position(db, product_id, zone_id)
    next_qty = position.qty + qty_delta
    if next_qty < 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Stock insuffisant dans cette zone.",
        )
    position.qty = next_qty
    db.add(
        InventoryMovement(
            product_id=product_id,
            zone_id=zone_id,
            qty_delta=qty_delta,
            reason=reason.value,
            reference_type=reference_type,
            reference_id=reference_id,
            transfer_group_id=transfer_group_id,
            note=note,
            created_by_id=actor_id,
        )
    )
    db.flush()
    return position


def transfer_between_zones(
    db: Session,
    *,
    product_id: UUID,
    from_zone_id: UUID,
    to_zone_id: UUID,
    quantity: int,
    actor_id: UUID | None,
    note: str | None = None,
) -> UUID:
    if from_zone_id == to_zone_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Zones source et cible identiques.")
    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantité de transfert invalide.")
    group_id = uuid4()
    apply_movement(
        db,
        product_id=product_id,
        zone_id=from_zone_id,
        qty_delta=-quantity,
        reason=MovementReason.TRANSFER_OUT,
        actor_id=actor_id,
        transfer_group_id=group_id,
        note=note,
        reference_type="transfer",
        reference_id=str(group_id),
    )
    apply_movement(
        db,
        product_id=product_id,
        zone_id=to_zone_id,
        qty_delta=quantity,
        reason=MovementReason.TRANSFER_IN,
        actor_id=actor_id,
        transfer_group_id=group_id,
        note=note,
        reference_type="transfer",
        reference_id=str(group_id),
    )
    return group_id


def total_qty(db: Session, product_id: UUID) -> int:
    positions = db.scalars(select(InventoryPosition).where(InventoryPosition.product_id == product_id)).all()
    return sum(item.qty for item in positions)
