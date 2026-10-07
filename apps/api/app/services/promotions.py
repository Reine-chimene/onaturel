from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import BundleZonePrice, ProductZonePrice, Promotion


def promotion_is_live(promo: Promotion, now: datetime | None = None) -> bool:
    if not promo.is_active:
        return False
    moment = now or datetime.now(timezone.utc)
    if promo.starts_at is not None and moment < promo.starts_at:
        return False
    if promo.ends_at is not None and moment > promo.ends_at:
        return False
    return True


def sync_promotion_price(db: Session, promo: Promotion) -> None:
    """Applique la promotion uniquement à la zone concernée. Aucune conversion, aucune copie."""
    live = promotion_is_live(promo)
    if promo.product_id is not None:
        row = db.scalar(
            select(ProductZonePrice).where(
                ProductZonePrice.product_id == promo.product_id,
                ProductZonePrice.zone_id == promo.zone_id,
            )
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce produit n’a pas de prix dans la zone choisie. Définissez d’abord le prix de zone.",
            )
        row.promo_price_amount = promo.promo_price_amount
        row.promo_is_active = live
        return
    if promo.bundle_id is not None:
        row = db.scalar(
            select(BundleZonePrice).where(
                BundleZonePrice.bundle_id == promo.bundle_id,
                BundleZonePrice.zone_id == promo.zone_id,
            )
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce pack n’a pas de prix dans la zone choisie.",
            )
        row.promo_price_amount = promo.promo_price_amount
        row.promo_is_active = live
        return
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Une promotion vise un produit ou un pack.")


def clear_other_target(promo: Promotion) -> None:
    if promo.product_id is not None:
        promo.bundle_id = None
    elif promo.bundle_id is not None:
        promo.product_id = None
