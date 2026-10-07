from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Bundle, BundleItem, BundleZonePrice, InventoryPosition, ProductZonePrice


def selling_price_for_product(db: Session, product_id: UUID, zone_id: UUID) -> int:
    row = db.scalar(
        select(ProductZonePrice).where(
            ProductZonePrice.product_id == product_id,
            ProductZonePrice.zone_id == zone_id,
            ProductZonePrice.is_available.is_(True),
        )
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ce produit n'a pas de prix dans cette zone.",
        )
    return row.selling_price


def bundle_available_in_zone(db: Session, bundle: Bundle, zone_id: UUID) -> bool:
    return bundle_buildable_qty(db, bundle, zone_id) > 0


def bundle_buildable_qty(db: Session, bundle: Bundle, zone_id: UUID) -> int:
    price = db.scalar(
        select(BundleZonePrice).where(
            BundleZonePrice.bundle_id == bundle.id,
            BundleZonePrice.zone_id == zone_id,
            BundleZonePrice.is_available.is_(True),
        )
    )
    if price is None:
        return 0
    items = db.scalars(select(BundleItem).where(BundleItem.bundle_id == bundle.id)).all()
    if not items:
        return 0
    possible: list[int] = []
    for item in items:
        if item.quantity <= 0:
            return 0
        position = db.scalar(
            select(InventoryPosition).where(
                InventoryPosition.product_id == item.product_id,
                InventoryPosition.zone_id == zone_id,
            )
        )
        qty = 0 if position is None else position.qty
        possible.append(qty // item.quantity)
    return min(possible) if possible else 0


def pack_buildable_qty(needed_and_have: list[tuple[int, int]]) -> int:
    """needed, have — used by tests without a database."""
    if not needed_and_have:
        return 0
    possible: list[int] = []
    for needed, have in needed_and_have:
        if needed <= 0:
            return 0
        possible.append(max(0, have) // needed)
    return min(possible)
