from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.deps import require_permission
from app.core.enums import FeePolicy, FulfillmentMode
from app.models import CommercialZone, Currency, User, ZoneFulfillmentMode
from app.services.audit import write_audit

router = APIRouter(prefix="/zones", tags=["zones"])


class CurrencyOut(BaseModel):
    id: str
    code: str
    name: str
    symbol: str
    minor_units: int


class FulfillmentModeOut(BaseModel):
    id: str
    mode: str
    label: str
    is_enabled: bool
    fee_policy: str
    default_fee_amount: int | None


class ZoneOut(BaseModel):
    id: str
    slug: str
    name: str
    is_active: bool
    sort_order: int
    currency: CurrencyOut
    fulfillment_modes: list[FulfillmentModeOut]


class ZoneUpdate(BaseModel):
    is_active: bool | None = None
    name: str | None = None
    sort_order: int | None = None


class FulfillmentUpdate(BaseModel):
    is_enabled: bool | None = None
    label: str | None = None
    fee_policy: FeePolicy | None = None
    default_fee_amount: int | None = None


def _to_out(zone: CommercialZone) -> ZoneOut:
    return ZoneOut(
        id=str(zone.id),
        slug=zone.slug,
        name=zone.name,
        is_active=zone.is_active,
        sort_order=zone.sort_order,
        currency=CurrencyOut(
            id=str(zone.currency.id),
            code=zone.currency.code,
            name=zone.currency.name,
            symbol=zone.currency.symbol,
            minor_units=zone.currency.minor_units,
        ),
        fulfillment_modes=[
            FulfillmentModeOut(
                id=str(item.id),
                mode=item.mode,
                label=item.label,
                is_enabled=item.is_enabled,
                fee_policy=item.fee_policy,
                default_fee_amount=item.default_fee_amount,
            )
            for item in sorted(zone.fulfillment_modes, key=lambda m: m.mode)
        ],
    )


@router.get("", response_model=list[ZoneOut])
def list_zones(db: Session = Depends(get_db)) -> list[ZoneOut]:
    stmt = (
        select(CommercialZone)
        .options(joinedload(CommercialZone.currency), joinedload(CommercialZone.fulfillment_modes))
        .where(CommercialZone.is_active.is_(True))
        .order_by(CommercialZone.sort_order)
    )
    zones = db.scalars(stmt).unique().all()
    return [_to_out(zone) for zone in zones]


@router.get("/all", response_model=list[ZoneOut])
def list_all_zones(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("zones:write")),
) -> list[ZoneOut]:
    stmt = (
        select(CommercialZone)
        .options(joinedload(CommercialZone.currency), joinedload(CommercialZone.fulfillment_modes))
        .order_by(CommercialZone.sort_order)
    )
    zones = db.scalars(stmt).unique().all()
    return [_to_out(zone) for zone in zones]


@router.get("/{zone_id}", response_model=ZoneOut)
def get_zone(zone_id: UUID, db: Session = Depends(get_db)) -> ZoneOut:
    zone = db.scalar(
        select(CommercialZone)
        .options(joinedload(CommercialZone.currency), joinedload(CommercialZone.fulfillment_modes))
        .where(CommercialZone.id == zone_id)
    )
    if zone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone introuvable.")
    return _to_out(zone)


@router.patch("/{zone_id}", response_model=ZoneOut)
def update_zone(
    zone_id: UUID,
    body: ZoneUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("zones:write")),
) -> ZoneOut:
    zone = db.get(CommercialZone, zone_id)
    if zone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone introuvable.")
    if body.is_active is not None:
        zone.is_active = body.is_active
    if body.name is not None:
        zone.name = body.name
    if body.sort_order is not None:
        zone.sort_order = body.sort_order
    write_audit(
        db,
        actor=user,
        action="zone.update",
        entity_type="commercial_zone",
        entity_id=zone.id,
        payload=body.model_dump(exclude_none=True),
    )
    db.commit()
    db.refresh(zone)
    zone = db.scalar(
        select(CommercialZone)
        .options(joinedload(CommercialZone.currency), joinedload(CommercialZone.fulfillment_modes))
        .where(CommercialZone.id == zone_id)
    )
    return _to_out(zone)


@router.patch("/{zone_id}/fulfillment-modes/{mode}", response_model=FulfillmentModeOut)
def update_fulfillment_mode(
    zone_id: UUID,
    mode: FulfillmentMode,
    body: FulfillmentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("zones:write")),
) -> FulfillmentModeOut:
    row = db.scalar(
        select(ZoneFulfillmentMode).where(
            ZoneFulfillmentMode.zone_id == zone_id,
            ZoneFulfillmentMode.mode == mode.value,
        )
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mode de réception introuvable.")
    if body.is_enabled is not None:
        row.is_enabled = body.is_enabled
    if body.label is not None:
        row.label = body.label
    if body.fee_policy is not None:
        row.fee_policy = body.fee_policy.value
    if body.default_fee_amount is not None:
        row.default_fee_amount = body.default_fee_amount
    write_audit(
        db,
        actor=user,
        action="zone.fulfillment.update",
        entity_type="zone_fulfillment_mode",
        entity_id=row.id,
        payload={"mode": mode.value, **body.model_dump(exclude_none=True)},
    )
    db.commit()
    db.refresh(row)
    return FulfillmentModeOut(
        id=str(row.id),
        mode=row.mode,
        label=row.label,
        is_enabled=row.is_enabled,
        fee_policy=row.fee_policy,
        default_fee_amount=row.default_fee_amount,
    )


currencies_router = APIRouter(prefix="/currencies", tags=["currencies"])


@currencies_router.get("", response_model=list[CurrencyOut])
def list_currencies(db: Session = Depends(get_db)) -> list[CurrencyOut]:
    rows = db.scalars(select(Currency).order_by(Currency.code)).all()
    return [
        CurrencyOut(
            id=str(item.id),
            code=item.code,
            name=item.name,
            symbol=item.symbol,
            minor_units=item.minor_units,
        )
        for item in rows
    ]
