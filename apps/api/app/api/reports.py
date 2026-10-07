from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import assert_zone_scope, require_permission
from app.core.enums import SalesChannel
from app.models import User
from app.services.reporting import revenue_query, revenue_series, sales_lines, top_products

router = APIRouter(prefix="/reports", tags=["reports"])


class RevenueRow(BaseModel):
    zone: str
    currency_code: str
    channel: str
    products_amount: int
    fulfillment_fees_paid: int
    count: int


class RevenueResponse(BaseModel):
    rows: list[RevenueRow]
    note: str


@router.get("/revenue", response_model=RevenueResponse)
def revenue(
    zone_id: UUID | None = Query(default=None),
    currency_code: str | None = Query(default=None),
    channel: SalesChannel | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("reports:sensitive")),
) -> RevenueResponse:
    if zone_id is not None:
        assert_zone_scope(user, zone_id)
    rows = revenue_query(
        db,
        date_from=date_from,
        date_to=date_to,
        zone_id=zone_id,
        currency_code=currency_code,
        channel=channel,
    )
    return RevenueResponse(
        rows=[RevenueRow(**item) for item in rows],
        note="Chaque ligne est une devise. Ne jamais additionner XAF et EUR.",
    )


@router.get("/top-products")
def report_top_products(
    zone_id: UUID | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("reports:sensitive")),
) -> dict:
    if zone_id is not None:
        assert_zone_scope(user, zone_id)
    return {
        "items": top_products(db, date_from=date_from, date_to=date_to, zone_id=zone_id, limit=limit),
        "note": "Classement par zone et devise. Aucune donnée fictive.",
    }


@router.get("/series")
def report_series(
    granularity: str = Query(default="day"),
    zone_id: UUID | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("reports:sensitive")),
) -> dict:
    if granularity not in {"day", "month"}:
        granularity = "day"
    if zone_id is not None:
        assert_zone_scope(user, zone_id)
    return {
        "series": revenue_series(
            db,
            granularity=granularity,
            date_from=date_from,
            date_to=date_to,
            zone_id=zone_id,
        ),
        "note": "Une série par zone et devise. Ne jamais fusionner XAF et EUR.",
    }


@router.get("/sales-lines")
def report_sales_lines(
    zone_id: UUID | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("reports:sensitive")),
) -> dict:
    if zone_id is not None:
        assert_zone_scope(user, zone_id)
    return {
        "items": sales_lines(db, date_from=date_from, date_to=date_to, zone_id=zone_id),
        "note": "Lignes issues des commandes confirmées. XAF et EUR restent séparés.",
    }
