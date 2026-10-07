from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.deps import require_permission
from app.core.text import slugify
from app.models import Bundle, BundleItem, BundleZonePrice, CommercialZone, Product, User
from app.services.audit import write_audit
from app.services.pricing import bundle_buildable_qty

router = APIRouter(prefix="/packs", tags=["packs"])


class PackItemIn(BaseModel):
    product_id: UUID
    quantity: int = Field(ge=1)


class PackPriceIn(BaseModel):
    zone_id: UUID
    price_amount: int | None = None
    is_available: bool | None = None


class PackWrite(BaseModel):
    name: str
    slug: str | None = None
    description: str | None = None
    is_active: bool = True
    items: list[PackItemIn] = Field(default_factory=list)
    prices: list[PackPriceIn] = Field(default_factory=list)


class PackPatch(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    is_active: bool | None = None
    is_archived: bool | None = None
    items: list[PackItemIn] | None = None
    prices: list[PackPriceIn] | None = None


def _pack_out(db: Session, bundle: Bundle) -> dict:
    zones = db.scalars(
        select(CommercialZone).options(joinedload(CommercialZone.currency)).order_by(CommercialZone.sort_order)
    ).all()
    price_map = {row.zone_id: row for row in bundle.zone_prices}
    zone_rows = []
    for zone in zones:
        price = price_map.get(zone.id)
        qty = bundle_buildable_qty(db, bundle, zone.id)
        zone_rows.append(
            {
                "zone_id": str(zone.id),
                "zone_slug": zone.slug,
                "zone_name": zone.name,
                "currency_code": zone.currency.code,
                "price_amount": None if price is None else price.price_amount,
                "promo_price_amount": None if price is None else price.promo_price_amount,
                "promo_is_active": False if price is None else price.promo_is_active,
                "selling_price": None if price is None else price.selling_price,
                "is_available": False if price is None else price.is_available,
                "buildable_qty": qty,
                "available": qty > 0 and bool(price and price.is_available),
            }
        )
    return {
        "id": str(bundle.id),
        "slug": bundle.slug,
        "name": bundle.name,
        "description": bundle.description,
        "is_active": bundle.is_active,
        "is_archived": bundle.is_archived,
        "items": [
            {
                "product_id": str(item.product_id),
                "product_name": item.product.name if item.product else None,
                "quantity": item.quantity,
            }
            for item in bundle.items
        ],
        "zones": zone_rows,
    }


def _load(db: Session, pack_id: UUID) -> Bundle:
    bundle = db.scalar(
        select(Bundle)
        .options(
            joinedload(Bundle.items).joinedload(BundleItem.product),
            joinedload(Bundle.zone_prices),
        )
        .where(Bundle.id == pack_id)
    )
    if bundle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pack introuvable.")
    return bundle


def _replace_items(db: Session, bundle: Bundle, items: list[PackItemIn]) -> None:
    bundle.items.clear()
    db.flush()
    seen: set[UUID] = set()
    for item in items:
        if item.product_id in seen:
            continue
        product = db.get(Product, item.product_id)
        if product is None or product.is_archived:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Produit de pack introuvable.")
        seen.add(item.product_id)
        db.add(BundleItem(bundle_id=bundle.id, product_id=item.product_id, quantity=item.quantity))


def _upsert_prices(db: Session, bundle: Bundle, prices: list[PackPriceIn]) -> None:
    for price in prices:
        if price.price_amount is not None and price.price_amount <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le prix du pack doit être supérieur à zéro.")
        row = db.scalar(
            select(BundleZonePrice).where(
                BundleZonePrice.bundle_id == bundle.id,
                BundleZonePrice.zone_id == price.zone_id,
            )
        )
        if row is None:
            if price.price_amount is None:
                continue
            db.add(
                BundleZonePrice(
                    bundle_id=bundle.id,
                    zone_id=price.zone_id,
                    price_amount=price.price_amount,
                    is_available=True if price.is_available is None else price.is_available,
                )
            )
            continue
        if price.price_amount is not None:
            row.price_amount = price.price_amount
        if price.is_available is not None:
            row.is_available = price.is_available


@router.get("")
def list_packs(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("catalog:read")),
) -> list[dict]:
    rows = db.scalars(
        select(Bundle)
        .options(joinedload(Bundle.items).joinedload(BundleItem.product), joinedload(Bundle.zone_prices))
        .where(Bundle.is_archived.is_(False))
        .order_by(Bundle.name)
    ).unique().all()
    return [_pack_out(db, row) for row in rows]


@router.post("")
def create_pack(
    body: PackWrite,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("catalog:write")),
) -> dict:
    slug = body.slug or slugify(body.name)
    if not slug:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nom de pack invalide.")
    if db.scalar(select(Bundle).where(Bundle.slug == slug)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce pack existe déjà.")
    bundle = Bundle(name=body.name.strip(), slug=slug, description=body.description, is_active=body.is_active)
    db.add(bundle)
    db.flush()
    _replace_items(db, bundle, body.items)
    _upsert_prices(db, bundle, body.prices)
    write_audit(db, actor=user, action="pack.create", entity_type="bundle", entity_id=bundle.id)
    db.commit()
    return _pack_out(db, _load(db, bundle.id))


@router.get("/{pack_id}")
def get_pack(
    pack_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("catalog:read")),
) -> dict:
    return _pack_out(db, _load(db, pack_id))


@router.patch("/{pack_id}")
def update_pack(
    pack_id: UUID,
    body: PackPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("catalog:write")),
) -> dict:
    bundle = db.get(Bundle, pack_id)
    if bundle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pack introuvable.")
    if body.name is not None:
        bundle.name = body.name.strip()
    if body.slug is not None:
        bundle.slug = body.slug
    if body.description is not None:
        bundle.description = body.description
    if body.is_active is not None:
        bundle.is_active = body.is_active
    if body.is_archived is not None:
        bundle.is_archived = body.is_archived
        if body.is_archived:
            bundle.is_active = False
    if body.items is not None:
        _replace_items(db, bundle, body.items)
    if body.prices is not None:
        _upsert_prices(db, bundle, body.prices)
    write_audit(db, actor=user, action="pack.update", entity_type="bundle", entity_id=bundle.id)
    db.commit()
    return _pack_out(db, _load(db, pack_id))
