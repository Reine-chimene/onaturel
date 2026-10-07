from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.deps import require_permission
from app.models import Order, User
from app.services.reporting import (
    active_promotions_count,
    items_sold_count,
    low_stock_count,
    order_status_counts,
    orders_created_count,
    out_of_stock_count,
    revenue_query,
    top_products,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview")
def overview(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("dashboard:access")),
) -> dict:
    counts = order_status_counts(db, date_from=date_from, date_to=date_to)
    revenue = revenue_query(db, date_from=date_from, date_to=date_to)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    recent_stmt = (
        select(Order)
        .options(joinedload(Order.zone), joinedload(Order.items))
        .order_by(Order.created_at.desc())
        .limit(8)
    )
    if date_from is not None:
        recent_stmt = recent_stmt.where(Order.created_at >= date_from)
    if date_to is not None:
        recent_stmt = recent_stmt.where(Order.created_at < date_to)
    recent = db.scalars(recent_stmt).unique().all()
    to_process = counts.get("NEW", 0) + counts.get("CONFIRMED", 0) + counts.get("PREPARING", 0) + counts.get("READY", 0)
    return {
        "greeting": "Bonjour, O’Naturelle",
        "period": {
            "from": None if date_from is None else date_from.isoformat(),
            "to": None if date_to is None else date_to.isoformat(),
        },
        "orders": {
            "today": orders_created_count(db, date_from=today_start),
            "new": counts.get("NEW", 0),
            "to_process": to_process,
            "confirmed": counts.get("CONFIRMED", 0),
            "cancelled": counts.get("CANCELLED", 0),
            "by_status": counts,
        },
        "products_sold": items_sold_count(db, date_from=date_from, date_to=date_to),
        "out_of_stock": out_of_stock_count(db),
        "low_stock": low_stock_count(db),
        "active_promotions": active_promotions_count(db),
        "revenue": revenue,
        "recent_orders": [
            {
                "id": str(order.id),
                "number": order.number,
                "created_at": order.created_at.isoformat(),
                "zone_name": order.zone.name if order.zone else None,
                "currency_code": order.currency_code,
                "products_amount": order.products_amount,
                "status": order.status,
                "items_summary": ", ".join(f"{item.name_snapshot} × {item.quantity}" for item in order.items),
            }
            for order in recent
        ],
        "top_products": top_products(db, date_from=date_from, date_to=date_to, limit=5),
        "note": "Chaque montant est une devise. Ne jamais additionner XAF et EUR.",
    }
