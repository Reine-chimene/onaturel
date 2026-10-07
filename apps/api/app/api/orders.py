from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.deps import assert_zone_scope, require_owner, require_permission
from app.core.enums import FulfillmentPaymentStatus, OrderStatus, ProductPaymentStatus
from app.core.security import is_owner_role
from app.models import Order, OrderItem, User
from app.services.audit import write_audit
from app.services.orders_admin import set_fulfillment_fee, set_fulfillment_payment, set_products_payment, transition_order

router = APIRouter(prefix="/orders", tags=["orders"])


class StatusIn(BaseModel):
    status: OrderStatus


class ProductsPaymentIn(BaseModel):
    products_payment_status: ProductPaymentStatus


class FulfillmentPaymentIn(BaseModel):
    fulfillment_payment_status: FulfillmentPaymentStatus


class FulfillmentFeeIn(BaseModel):
    fulfillment_fee_amount: int


def _item_out(item: OrderItem) -> dict:
    return {
        "id": str(item.id),
        "product_id": str(item.product_id) if item.product_id else None,
        "bundle_id": str(item.bundle_id) if item.bundle_id else None,
        "name": item.name_snapshot,
        "quantity": item.quantity,
        "unit_price": item.unit_price_snapshot,
        "line_total": item.line_total,
    }


def _order_out(order: Order, *, detail: bool = False) -> dict:
    payload = {
        "id": str(order.id),
        "number": order.number,
        "created_at": order.created_at.isoformat(),
        "zone_id": str(order.zone_id),
        "zone_name": order.zone.name if order.zone else None,
        "zone_slug": order.zone.slug if order.zone else None,
        "currency_code": order.currency_code,
        "status": order.status,
        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "city": order.city,
        "neighborhood": order.neighborhood,
        "fulfillment_mode": order.fulfillment_mode,
        "products_amount": order.products_amount,
        "fulfillment_fee_amount": order.fulfillment_fee_amount,
        "products_payment_status": order.products_payment_status,
        "fulfillment_payment_status": order.fulfillment_payment_status,
        "notes": order.notes,
        "items_summary": ", ".join(f"{item.name_snapshot} × {item.quantity}" for item in order.items),
        "items_count": sum(item.quantity for item in order.items),
    }
    if detail:
        payload["items"] = [_item_out(item) for item in order.items]
        payload["stock_decremented"] = order.stock_decremented_at is not None
        payload["total_due"] = order.products_amount + order.fulfillment_fee_amount
    return payload


def _base_stmt():
    return select(Order).options(joinedload(Order.zone), joinedload(Order.items)).order_by(Order.created_at.desc())


@router.get("")
def list_orders(
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    zone_id: UUID | None = Query(default=None),
    fulfillment_mode: str | None = Query(default=None),
    products_payment: ProductPaymentStatus | None = Query(default=None),
    fulfillment_payment: FulfillmentPaymentStatus | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("orders:read")),
) -> list[dict]:
    stmt = _base_stmt()
    if not is_owner_role(user.role_enum):
        if user.assigned_zone_id is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Zone assignée requise.")
        stmt = stmt.where(Order.zone_id == user.assigned_zone_id)
    elif zone_id is not None:
        assert_zone_scope(user, zone_id)
        stmt = stmt.where(Order.zone_id == zone_id)
    if status_filter is not None:
        stmt = stmt.where(Order.status == status_filter.value)
    if fulfillment_mode:
        stmt = stmt.where(Order.fulfillment_mode == fulfillment_mode)
    if products_payment is not None:
        stmt = stmt.where(Order.products_payment_status == products_payment.value)
    if fulfillment_payment is not None:
        stmt = stmt.where(Order.fulfillment_payment_status == fulfillment_payment.value)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Order.number.ilike(like),
                Order.customer_name.ilike(like),
                Order.customer_phone.ilike(like),
            )
        )
    rows = db.scalars(stmt).unique().all()
    return [_order_out(row) for row in rows]


@router.get("/{order_id}")
def get_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("orders:read")),
) -> dict:
    order = db.scalar(_base_stmt().where(Order.id == order_id))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable.")
    assert_zone_scope(user, order.zone_id)
    return _order_out(order, detail=True)


@router.post("/{order_id}/status")
def change_order_status(
    order_id: UUID,
    body: StatusIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
) -> dict:
    order = db.scalar(_base_stmt().where(Order.id == order_id))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable.")
    transition_order(db, order, body.status, user.id)
    write_audit(
        db,
        actor=user,
        action="order.status",
        entity_type="order",
        entity_id=order.id,
        payload={"status": body.status.value},
    )
    db.commit()
    order = db.scalar(_base_stmt().where(Order.id == order_id))
    return _order_out(order, detail=True)


@router.patch("/{order_id}/products-payment")
def patch_products_payment(
    order_id: UUID,
    body: ProductsPaymentIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
) -> dict:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable.")
    set_products_payment(order, body.products_payment_status)
    write_audit(db, actor=user, action="order.products_payment", entity_type="order", entity_id=order.id)
    db.commit()
    return _order_out(db.scalar(_base_stmt().where(Order.id == order_id)), detail=True)


@router.patch("/{order_id}/fulfillment-payment")
def patch_fulfillment_payment(
    order_id: UUID,
    body: FulfillmentPaymentIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
) -> dict:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable.")
    set_fulfillment_payment(order, body.fulfillment_payment_status)
    write_audit(db, actor=user, action="order.fulfillment_payment", entity_type="order", entity_id=order.id)
    db.commit()
    return _order_out(db.scalar(_base_stmt().where(Order.id == order_id)), detail=True)


@router.patch("/{order_id}/fulfillment-fee")
def patch_fulfillment_fee(
    order_id: UUID,
    body: FulfillmentFeeIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
) -> dict:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable.")
    set_fulfillment_fee(order, body.fulfillment_fee_amount)
    write_audit(db, actor=user, action="order.fulfillment_fee", entity_type="order", entity_id=order.id)
    db.commit()
    return _order_out(db.scalar(_base_stmt().where(Order.id == order_id)), detail=True)
