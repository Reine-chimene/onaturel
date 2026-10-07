from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.enums import FulfillmentPaymentStatus, OrderStatus, ProductPaymentStatus
from app.models import Order
from app.services.orders import cancel_order_stock, confirm_order_stock

ALLOWED_TRANSITIONS: dict[OrderStatus, frozenset[OrderStatus]] = {
    OrderStatus.NEW: frozenset({OrderStatus.CONFIRMED, OrderStatus.CANCELLED}),
    OrderStatus.CONFIRMED: frozenset({OrderStatus.PREPARING, OrderStatus.CANCELLED}),
    OrderStatus.PREPARING: frozenset({OrderStatus.READY, OrderStatus.CANCELLED}),
    OrderStatus.READY: frozenset({OrderStatus.DELIVERED, OrderStatus.CANCELLED}),
    OrderStatus.DELIVERED: frozenset(),
    OrderStatus.CANCELLED: frozenset(),
}


def transition_order(db: Session, order: Order, target: OrderStatus, actor_id: UUID | None) -> Order:
    current = OrderStatus(order.status)
    allowed = ALLOWED_TRANSITIONS[current]
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Transition {current.value} → {target.value} non autorisée.",
        )
    if target is OrderStatus.CONFIRMED:
        confirm_order_stock(db, order, actor_id)
        return order
    if target is OrderStatus.CANCELLED:
        cancel_order_stock(db, order, actor_id)
        return order
    order.status = target.value
    return order


def set_products_payment(order: Order, value: ProductPaymentStatus) -> None:
    order.products_payment_status = value.value


def set_fulfillment_payment(order: Order, value: FulfillmentPaymentStatus) -> None:
    order.fulfillment_payment_status = value.value


def set_fulfillment_fee(order: Order, amount: int) -> None:
    if amount < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Les frais ne peuvent pas être négatifs.")
    order.fulfillment_fee_amount = amount
