from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.enums import MovementReason
from app.core.storage import public_object_url
from app.core.text import slugify
from app.models import (
    Category,
    CommercialZone,
    FileAsset,
    InventoryPosition,
    Product,
    ProductImage,
    ProductZonePrice,
)
from app.services.inventory import apply_movement, default_low_stock_threshold, get_or_create_position, stock_status


def unique_slug(db: Session, name: str, current_id: UUID | None = None) -> str:
    base = slugify(name)
    if not base:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le nom ne permet pas de former un identifiant.")
    slug = base
    n = 2
    while True:
        existing = db.scalar(select(Product).where(Product.slug == slug))
        if existing is None or existing.id == current_id:
            return slug
        slug = f"{base}-{n}"
        n += 1


def unique_category_slug(db: Session, name: str, current_id: UUID | None = None) -> str:
    base = slugify(name)
    if not base:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le nom ne permet pas de former un identifiant.")
    slug = base
    n = 2
    while True:
        existing = db.scalar(select(Category).where(Category.slug == slug))
        if existing is None or existing.id == current_id:
            return slug
        slug = f"{base}-{n}"
        n += 1


def load_product(db: Session, product_id: UUID) -> Product:
    product = db.scalar(
        select(Product)
        .options(
            joinedload(Product.category),
            joinedload(Product.images).joinedload(ProductImage.file),
            joinedload(Product.zone_prices).joinedload(ProductZonePrice.zone).joinedload(CommercialZone.currency),
        )
        .where(Product.id == product_id)
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable.")
    return product


def upsert_zone_price(
    db: Session,
    *,
    product_id: UUID,
    zone_id: UUID,
    price_amount: int | None,
    is_available: bool | None,
) -> ProductZonePrice | None:
    row = db.scalar(
        select(ProductZonePrice).where(
            ProductZonePrice.product_id == product_id,
            ProductZonePrice.zone_id == zone_id,
        )
    )
    if price_amount is None and row is None:
        return None
    if price_amount is not None and price_amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le prix doit être supérieur à zéro.")
    if row is None:
        if price_amount is None:
            return None
        row = ProductZonePrice(
            product_id=product_id,
            zone_id=zone_id,
            price_amount=price_amount,
            is_available=True if is_available is None else is_available,
        )
        db.add(row)
        db.flush()
        return row
    if price_amount is not None:
        row.price_amount = price_amount
    if is_available is not None:
        row.is_available = is_available
    return row


def set_zone_qty(
    db: Session,
    *,
    product_id: UUID,
    zone_id: UUID,
    qty: int,
    actor_id: UUID,
    note: str | None = None,
) -> InventoryPosition:
    if qty < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le stock ne peut pas être négatif.")
    position = get_or_create_position(db, product_id, zone_id)
    delta = qty - position.qty
    if delta == 0:
        return position
    return apply_movement(
        db,
        product_id=product_id,
        zone_id=zone_id,
        qty_delta=delta,
        reason=MovementReason.ADJUSTMENT if delta < 0 else MovementReason.RECEIPT,
        actor_id=actor_id,
        note=note or "Ajustement propriétaire",
    )


def product_images_out(product: Product) -> list[dict]:
    images = sorted(product.images, key=lambda item: (item.sort_order, str(item.id)))
    return [
        {
            "id": str(image.id),
            "file_id": str(image.file_id),
            "url": public_object_url(image.file.storage_key) if image.file else None,
            "sort_order": image.sort_order,
            "is_primary": image.is_primary,
        }
        for image in images
    ]


def product_admin_out(db: Session, product: Product) -> dict:
    threshold = default_low_stock_threshold(db)
    zones = db.scalars(
        select(CommercialZone).options(joinedload(CommercialZone.currency)).order_by(CommercialZone.sort_order)
    ).all()
    zone_map = {price.zone_id: price for price in product.zone_prices}
    positions = {
        item.zone_id: item
        for item in db.scalars(select(InventoryPosition).where(InventoryPosition.product_id == product.id)).all()
    }
    images = product_images_out(product)
    primary = next((img["url"] for img in images if img["is_primary"] and img["url"]), None)
    if primary is None and images:
        primary = images[0]["url"]
    zone_rows = []
    for zone in zones:
        price = zone_map.get(zone.id)
        position = positions.get(zone.id)
        qty = 0 if position is None else position.qty
        low = (position.low_stock_threshold if position else None) or threshold
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
                "stock": qty,
                "stock_status": stock_status(qty, low).value,
                "low_stock_threshold": position.low_stock_threshold if position else None,
            }
        )
    return {
        "id": str(product.id),
        "sku": product.sku,
        "slug": product.slug,
        "name": product.name,
        "description": product.description,
        "category_id": str(product.category_id) if product.category_id else None,
        "category_name": product.category.name if product.category else None,
        "is_new": product.is_new,
        "is_featured": product.is_featured,
        "is_active": product.is_active,
        "is_archived": product.is_archived,
        "image_url": primary,
        "images": images,
        "zones": zone_rows,
    }


def attach_image(db: Session, product: Product, file_asset: FileAsset, *, as_primary: bool = False) -> ProductImage:
    next_order = max((image.sort_order for image in product.images), default=-1) + 1
    make_primary = as_primary or not product.images
    if make_primary:
        for image in product.images:
            image.is_primary = False
    row = ProductImage(
        product_id=product.id,
        file_id=file_asset.id,
        sort_order=next_order,
        is_primary=make_primary,
    )
    db.add(row)
    db.flush()
    return row
