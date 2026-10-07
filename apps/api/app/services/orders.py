from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.enums import MovementReason, OrderStatus
from app.models import Order, OrderItem
from app.services.inventory import apply_movement


CONFIRMED_STATUSES = {
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.DELIVERED,
}


def order_counts_in_revenue(status: str) -> bool:
    return status in {item.value for item in CONFIRMED_STATUSES}


def confirm_order_stock(db: Session, order: Order, actor_id: UUID | None) -> None:
    if order.stock_decremented_at is not None:
        return
    for item in order.items:
        _apply_line(
            db,
            order=order,
            item=item,
            sign=-1,
            reason=MovementReason.ORDER_CONFIRMED,
            actor_id=actor_id,
        )
    order.stock_decremented_at = datetime.now(timezone.utc)
    order.status = OrderStatus.CONFIRMED.value


def cancel_order_stock(db: Session, order: Order, actor_id: UUID | None) -> None:
    if order.status == OrderStatus.CANCELLED.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Commande déjà annulée.")
    if order.stock_decremented_at is not None:
        for item in order.items:
            _apply_line(
                db,
                order=order,
                item=item,
                sign=1,
                reason=MovementReason.ORDER_CANCELLED,
                actor_id=actor_id,
            )
        order.stock_decremented_at = None
    order.status = OrderStatus.CANCELLED.value


def _apply_line(
    db: Session,
    *,
    order: Order,
    item: OrderItem,
    sign: int,
    reason: MovementReason,
    actor_id: UUID | None,
) -> None:
    if item.product_id is not None:
        apply_movement(
            db,
            product_id=item.product_id,
            zone_id=order.zone_id,
            qty_delta=sign * item.quantity,
            reason=reason,
            actor_id=actor_id,
            reference_type="order",
            reference_id=str(order.id),
        )
        return
    if item.bundle_id is not None:
        from app.models import BundleItem
        from sqlalchemy import select

        components = db.scalars(select(BundleItem).where(BundleItem.bundle_id == item.bundle_id)).all()
        for component in components:
            apply_movement(
                db,
                product_id=component.product_id,
                zone_id=order.zone_id,
                qty_delta=sign * component.quantity * item.quantity,
                reason=reason,
                actor_id=actor_id,
                reference_type="order",
                reference_id=str(order.id),
            )
