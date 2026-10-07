from datetime import datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, case, func, select
from sqlalchemy.orm import Session

from app.core.enums import FulfillmentPaymentStatus, OrderStatus, SaleStatus, SalesChannel
from app.models import CommercialZone, InventoryPosition, Order, OrderItem, Promotion, Sale
from app.services.inventory import default_low_stock_threshold
from app.services.orders import CONFIRMED_STATUSES
from app.services.promotions import promotion_is_live


def revenue_query(
    db: Session,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    zone_id: UUID | None = None,
    currency_code: str | None = None,
    channel: SalesChannel | None = None,
) -> list[dict]:
    """Agrège le CA sans jamais additionner deux devises."""
    buckets: dict[tuple[str, str, str], dict] = {}

    if channel in (None, SalesChannel.ONLINE):
        stmt = _online_stmt(date_from, date_to, zone_id, currency_code)
        for zone_name, curr, products, fees, count in db.execute(stmt):
            key = (zone_name, curr, SalesChannel.ONLINE.value)
            buckets[key] = {
                "zone": zone_name,
                "currency_code": curr,
                "channel": SalesChannel.ONLINE.value,
                "products_amount": int(products or 0),
                "fulfillment_fees_paid": int(fees or 0),
                "count": int(count or 0),
            }

    if channel in (None, SalesChannel.STORE):
        stmt = _store_stmt(date_from, date_to, zone_id, currency_code)
        for zone_name, curr, products, fees, count in db.execute(stmt):
            key = (zone_name, curr, SalesChannel.STORE.value)
            buckets[key] = {
                "zone": zone_name,
                "currency_code": curr,
                "channel": SalesChannel.STORE.value,
                "products_amount": int(products or 0),
                "fulfillment_fees_paid": int(fees or 0),
                "count": int(count or 0),
            }

    rows = list(buckets.values())
    codes = {row["currency_code"] for row in rows}
    if currency_code is None and len(codes) > 1:
        # Several currencies in the result is allowed as separate rows,
        # never as a single mixed total — callers must not sum them.
        pass
    return sorted(rows, key=lambda row: (row["currency_code"], row["zone"], row["channel"]))


def assert_no_mixed_total(rows: list[dict]) -> None:
    codes = {row["currency_code"] for row in rows}
    if len(codes) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le chiffre d'affaires ne peut pas mélanger XAF et EUR dans un total unique.",
        )


def _online_stmt(
    date_from: datetime | None,
    date_to: datetime | None,
    zone_id: UUID | None,
    currency_code: str | None,
) -> Select:
    fee = func.sum(
        case(
            (Order.fulfillment_payment_status == FulfillmentPaymentStatus.PAID.value, Order.fulfillment_fee_amount),
            else_=0,
        )
    )
    stmt = (
        select(
            CommercialZone.name,
            Order.currency_code,
            func.coalesce(func.sum(Order.products_amount), 0),
            func.coalesce(fee, 0),
            func.count(Order.id),
        )
        .join(CommercialZone, CommercialZone.id == Order.zone_id)
        .where(Order.status.in_([item.value for item in (
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.DELIVERED,
        )]))
        .group_by(CommercialZone.name, Order.currency_code)
    )
    if date_from is not None:
        stmt = stmt.where(Order.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Order.created_at < date_to)
    if zone_id is not None:
        stmt = stmt.where(Order.zone_id == zone_id)
    if currency_code is not None:
        stmt = stmt.where(Order.currency_code == currency_code)
    return stmt


def _store_stmt(
    date_from: datetime | None,
    date_to: datetime | None,
    zone_id: UUID | None,
    currency_code: str | None,
) -> Select:
    stmt = (
        select(
            CommercialZone.name,
            Sale.currency_code,
            func.coalesce(func.sum(Sale.products_amount), 0),
            func.coalesce(func.sum(Sale.fulfillment_fee_amount), 0),
            func.count(Sale.id),
        )
        .join(CommercialZone, CommercialZone.id == Sale.zone_id)
        .where(Sale.status == SaleStatus.COMPLETED.value)
        .group_by(CommercialZone.name, Sale.currency_code)
    )
    if date_from is not None:
        stmt = stmt.where(Sale.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Sale.created_at < date_to)
    if zone_id is not None:
        stmt = stmt.where(Sale.zone_id == zone_id)
    if currency_code is not None:
        stmt = stmt.where(Sale.currency_code == currency_code)
    return stmt


REVENUE_STATUSES = [item.value for item in CONFIRMED_STATUSES]


def order_status_counts(
    db: Session,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> dict[str, int]:
    stmt = select(Order.status, func.count(Order.id)).group_by(Order.status)
    if date_from is not None:
        stmt = stmt.where(Order.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Order.created_at < date_to)
    found = {status: int(count) for status, count in db.execute(stmt)}
    return {item.value: found.get(item.value, 0) for item in OrderStatus}


def items_sold_count(
    db: Session,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    zone_id: UUID | None = None,
) -> int:
    stmt = (
        select(func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status.in_(REVENUE_STATUSES))
    )
    if date_from is not None:
        stmt = stmt.where(Order.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Order.created_at < date_to)
    if zone_id is not None:
        stmt = stmt.where(Order.zone_id == zone_id)
    return int(db.scalar(stmt) or 0)


def out_of_stock_count(db: Session) -> int:
    return int(
        db.scalar(
            select(func.count(InventoryPosition.id)).where(InventoryPosition.qty <= 0)
        )
        or 0
    )


def low_stock_count(db: Session) -> int:
    threshold = default_low_stock_threshold(db)
    rows = db.scalars(select(InventoryPosition)).all()
    return sum(
        1
        for row in rows
        if 0 < row.qty <= (row.low_stock_threshold if row.low_stock_threshold is not None else threshold)
    )


def orders_created_count(
    db: Session,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> int:
    stmt = select(func.count(Order.id))
    if date_from is not None:
        stmt = stmt.where(Order.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Order.created_at < date_to)
    return int(db.scalar(stmt) or 0)


def sales_lines(
    db: Session,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    zone_id: UUID | None = None,
    limit: int = 200,
) -> list[dict]:
    stmt = (
        select(
            Order.number,
            Order.created_at,
            CommercialZone.name,
            Order.currency_code,
            OrderItem.name_snapshot,
            OrderItem.quantity,
            OrderItem.unit_price_snapshot,
            OrderItem.line_total,
        )
        .join(Order, Order.id == OrderItem.order_id)
        .join(CommercialZone, CommercialZone.id == Order.zone_id)
        .where(Order.status.in_(REVENUE_STATUSES))
        .order_by(Order.created_at.desc())
        .limit(limit)
    )
    if date_from is not None:
        stmt = stmt.where(Order.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Order.created_at < date_to)
    if zone_id is not None:
        stmt = stmt.where(Order.zone_id == zone_id)
    return [
        {
            "order_number": number,
            "created_at": created_at.isoformat(),
            "zone": zone,
            "currency_code": currency,
            "name": name,
            "quantity": int(qty),
            "unit_price": int(unit_price),
            "amount": int(amount),
        }
        for number, created_at, zone, currency, name, qty, unit_price, amount in db.execute(stmt)
    ]


def active_promotions_count(db: Session) -> int:
    rows = db.scalars(select(Promotion).where(Promotion.is_active.is_(True))).all()
    return sum(1 for row in rows if promotion_is_live(row))


def top_products(
    db: Session,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    zone_id: UUID | None = None,
    limit: int = 10,
) -> list[dict]:
    stmt = (
        select(
            CommercialZone.name,
            Order.currency_code,
            OrderItem.product_id,
            OrderItem.name_snapshot,
            func.sum(OrderItem.quantity),
            func.sum(OrderItem.line_total),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .join(CommercialZone, CommercialZone.id == Order.zone_id)
        .where(Order.status.in_(REVENUE_STATUSES))
        .group_by(CommercialZone.name, Order.currency_code, OrderItem.product_id, OrderItem.name_snapshot)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
    )
    if date_from is not None:
        stmt = stmt.where(Order.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Order.created_at < date_to)
    if zone_id is not None:
        stmt = stmt.where(Order.zone_id == zone_id)
    return [
        {
            "zone": zone,
            "currency_code": currency,
            "product_id": str(product_id) if product_id else None,
            "name": name,
            "quantity": int(qty or 0),
            "amount": int(amount or 0),
        }
        for zone, currency, product_id, name, qty, amount in db.execute(stmt)
    ]


def revenue_series(
    db: Session,
    *,
    granularity: str,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    zone_id: UUID | None = None,
) -> list[dict]:
    if granularity == "month":
        period = func.to_char(Order.created_at, "YYYY-MM")
    else:
        period = func.to_char(Order.created_at, "YYYY-MM-DD")
    fee = func.sum(
        case(
            (Order.fulfillment_payment_status == FulfillmentPaymentStatus.PAID.value, Order.fulfillment_fee_amount),
            else_=0,
        )
    )
    stmt = (
        select(
            CommercialZone.name,
            Order.currency_code,
            period,
            func.coalesce(func.sum(Order.products_amount), 0),
            func.coalesce(fee, 0),
            func.count(Order.id),
        )
        .join(CommercialZone, CommercialZone.id == Order.zone_id)
        .where(Order.status.in_(REVENUE_STATUSES))
        .group_by(CommercialZone.name, Order.currency_code, period)
        .order_by(period)
    )
    if date_from is not None:
        stmt = stmt.where(Order.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Order.created_at < date_to)
    if zone_id is not None:
        stmt = stmt.where(Order.zone_id == zone_id)
    buckets: dict[tuple[str, str], dict] = {}
    for zone, currency, day, products, fees, count in db.execute(stmt):
        key = (zone, currency)
        row = buckets.setdefault(
            key,
            {"zone": zone, "currency_code": currency, "points": []},
        )
        row["points"].append(
            {
                "period": day,
                "products_amount": int(products or 0),
                "fulfillment_fees_paid": int(fees or 0),
                "orders": int(count or 0),
            }
        )
    return list(buckets.values())
