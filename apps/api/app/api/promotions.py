from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import require_permission
from app.models import Bundle, Product, Promotion, User
from app.services.audit import write_audit
from app.services.promotions import clear_other_target, promotion_is_live, sync_promotion_price

router = APIRouter(prefix="/promotions", tags=["promotions"])


class PromotionWrite(BaseModel):
    product_id: UUID | None = None
    bundle_id: UUID | None = None
    zone_id: UUID
    promo_price_amount: int
    is_active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None

    @model_validator(mode="after")
    def one_target(self) -> "PromotionWrite":
        if bool(self.product_id) == bool(self.bundle_id):
            raise ValueError("Indiquez un produit ou un pack, pas les deux.")
        if self.promo_price_amount <= 0:
            raise ValueError("Le prix promotionnel doit être supérieur à zéro.")
        return self


class PromotionPatch(BaseModel):
    promo_price_amount: int | None = None
    is_active: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    zone_id: UUID | None = None


def _out(row: Promotion, db: Session) -> dict:
    product_name = None
    bundle_name = None
    if row.product_id:
        product = db.get(Product, row.product_id)
        product_name = None if product is None else product.name
    if row.bundle_id:
        bundle = db.get(Bundle, row.bundle_id)
        bundle_name = None if bundle is None else bundle.name
    return {
        "id": str(row.id),
        "product_id": str(row.product_id) if row.product_id else None,
        "bundle_id": str(row.bundle_id) if row.bundle_id else None,
        "product_name": product_name,
        "bundle_name": bundle_name,
        "zone_id": str(row.zone_id),
        "promo_price_amount": row.promo_price_amount,
        "is_active": row.is_active,
        "is_live": promotion_is_live(row),
        "starts_at": None if row.starts_at is None else row.starts_at.isoformat(),
        "ends_at": None if row.ends_at is None else row.ends_at.isoformat(),
    }


@router.get("")
def list_promotions(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("catalog:read")),
) -> list[dict]:
    rows = db.scalars(select(Promotion).order_by(Promotion.created_at.desc())).all()
    return [_out(row, db) for row in rows]


@router.post("")
def create_promotion(
    body: PromotionWrite,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("pricing:write")),
) -> dict:
    row = Promotion(
        product_id=body.product_id,
        bundle_id=body.bundle_id,
        zone_id=body.zone_id,
        promo_price_amount=body.promo_price_amount,
        is_active=body.is_active,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
    )
    clear_other_target(row)
    db.add(row)
    db.flush()
    sync_promotion_price(db, row)
    write_audit(db, actor=user, action="promotion.create", entity_type="promotion", entity_id=row.id)
    db.commit()
    db.refresh(row)
    return _out(row, db)


@router.patch("/{promotion_id}")
def update_promotion(
    promotion_id: UUID,
    body: PromotionPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("pricing:write")),
) -> dict:
    row = db.get(Promotion, promotion_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promotion introuvable.")
    if body.promo_price_amount is not None:
        if body.promo_price_amount <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Prix promotionnel invalide.")
        row.promo_price_amount = body.promo_price_amount
    if body.is_active is not None:
        row.is_active = body.is_active
    if body.starts_at is not None:
        row.starts_at = body.starts_at
    if body.ends_at is not None:
        row.ends_at = body.ends_at
    if body.zone_id is not None:
        row.zone_id = body.zone_id
    sync_promotion_price(db, row)
    write_audit(db, actor=user, action="promotion.update", entity_type="promotion", entity_id=row.id)
    db.commit()
    db.refresh(row)
    return _out(row, db)
