from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.deps import require_permission
from app.models import Category, FileAsset, Product, ProductImage, User
from app.services.audit import write_audit
from app.services.catalog_admin import (
    attach_image,
    load_product,
    product_admin_out,
    set_zone_qty,
    unique_category_slug,
    unique_slug,
    upsert_zone_price,
)

router = APIRouter(tags=["catalog"])


class CategoryOut(BaseModel):
    id: str
    slug: str
    name: str
    description: str | None = None
    parent_id: str | None
    sort_order: int
    is_visible: bool


class CategoryWrite(BaseModel):
    name: str
    slug: str | None = None
    description: str | None = None
    parent_id: UUID | None = None
    sort_order: int = 0
    is_visible: bool = True


class CategoryPatch(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    parent_id: UUID | None = None
    sort_order: int | None = None
    is_visible: bool | None = None


class ProductListOut(BaseModel):
    id: str
    slug: str
    name: str
    sku: str | None
    is_active: bool
    is_new: bool
    zone_price: int | None = None
    zone_stock: int | None = None
    stock_status: str | None = None
    total_stock: int | None = None


class ZonePriceIn(BaseModel):
    zone_id: UUID
    price_amount: int | None = None
    is_available: bool | None = None


class ZoneStockIn(BaseModel):
    zone_id: UUID
    qty: int = Field(ge=0)


class ProductWrite(BaseModel):
    name: str
    slug: str | None = None
    sku: str | None = None
    description: str | None = None
    category_id: UUID | None = None
    is_new: bool = False
    is_featured: bool = False
    is_active: bool = True
    prices: list[ZonePriceIn] = Field(default_factory=list)
    stocks: list[ZoneStockIn] = Field(default_factory=list)


class ProductPatch(BaseModel):
    name: str | None = None
    slug: str | None = None
    sku: str | None = None
    description: str | None = None
    category_id: UUID | None = None
    is_new: bool | None = None
    is_featured: bool | None = None
    is_active: bool | None = None
    is_archived: bool | None = None
    prices: list[ZonePriceIn] | None = None
    stocks: list[ZoneStockIn] | None = None


class ImageOrderIn(BaseModel):
    id: UUID
    sort_order: int
    is_primary: bool = False


def _category_out(item: Category) -> CategoryOut:
    return CategoryOut(
        id=str(item.id),
        slug=item.slug,
        name=item.name,
        description=item.description,
        parent_id=str(item.parent_id) if item.parent_id else None,
        sort_order=item.sort_order,
        is_visible=item.is_visible,
    )


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("catalog:read")),
) -> list[CategoryOut]:
    rows = db.scalars(select(Category).order_by(Category.sort_order, Category.name)).all()
    return [_category_out(item) for item in rows]


@router.post("/categories", response_model=CategoryOut)
def create_category(
    body: CategoryWrite,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("catalog:write")),
) -> CategoryOut:
    slug = body.slug or unique_category_slug(db, body.name)
    existing = db.scalar(select(Category).where(Category.slug == slug))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette catégorie existe déjà.")
    row = Category(
        name=body.name.strip(),
        slug=slug,
        description=body.description,
        parent_id=body.parent_id,
        sort_order=body.sort_order,
        is_visible=body.is_visible,
    )
    db.add(row)
    db.flush()
    write_audit(db, actor=user, action="category.create", entity_type="category", entity_id=row.id)
    db.commit()
    db.refresh(row)
    return _category_out(row)


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: UUID,
    body: CategoryPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("catalog:write")),
) -> CategoryOut:
    row = db.get(Category, category_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catégorie introuvable.")
    if body.name is not None:
        row.name = body.name.strip()
    if body.slug is not None:
        row.slug = body.slug
    elif body.name is not None:
        row.slug = unique_category_slug(db, body.name, row.id)
    if body.description is not None:
        row.description = body.description
    if body.parent_id is not None:
        row.parent_id = body.parent_id
    if body.sort_order is not None:
        row.sort_order = body.sort_order
    if body.is_visible is not None:
        row.is_visible = body.is_visible
    write_audit(db, actor=user, action="category.update", entity_type="category", entity_id=row.id)
    db.commit()
    db.refresh(row)
    return _category_out(row)


@router.get("/products")
def list_products(
    zone_id: UUID | None = Query(default=None),
    q: str | None = Query(default=None),
    include_archived: bool = Query(default=False),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("catalog:read")),
) -> list[dict]:
    from app.core.security import is_owner_role

    stmt = select(Product).options(
        joinedload(Product.category),
        joinedload(Product.images).joinedload(ProductImage.file),
        joinedload(Product.zone_prices),
    )
    if not include_archived:
        stmt = stmt.where(Product.is_archived.is_(False))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.slug.ilike(like), Product.sku.ilike(like)))
    products = db.scalars(stmt.order_by(Product.name)).unique().all()
    if is_owner_role(user.role_enum) and zone_id is None:
        return [product_admin_out(db, product) for product in products]
    from app.core.deps import assert_zone_scope
    from app.models import InventoryPosition, ProductZonePrice
    from app.services.inventory import default_low_stock_threshold, stock_status, total_qty

    if zone_id is not None:
        assert_zone_scope(user, zone_id)
    threshold = default_low_stock_threshold(db)
    result = []
    for product in products:
        zone_price = None
        zone_stock = None
        status_label = None
        if zone_id is not None:
            price = db.scalar(
                select(ProductZonePrice).where(
                    ProductZonePrice.product_id == product.id,
                    ProductZonePrice.zone_id == zone_id,
                )
            )
            if price is not None and price.is_available:
                zone_price = price.selling_price
            position = db.scalar(
                select(InventoryPosition).where(
                    InventoryPosition.product_id == product.id,
                    InventoryPosition.zone_id == zone_id,
                )
            )
            zone_stock = 0 if position is None else position.qty
            status_label = stock_status(zone_stock, (position.low_stock_threshold if position else None) or threshold).value
        result.append(
            ProductListOut(
                id=str(product.id),
                slug=product.slug,
                name=product.name,
                sku=product.sku,
                is_active=product.is_active,
                is_new=product.is_new,
                zone_price=zone_price,
                zone_stock=zone_stock,
                stock_status=status_label,
                total_stock=total_qty(db, product.id) if is_owner_role(user.role_enum) else None,
            ).model_dump()
        )
    return result


@router.post("/products")
def create_product(
    body: ProductWrite,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("catalog:write")),
) -> dict:
    slug = body.slug or unique_slug(db, body.name)
    if db.scalar(select(Product).where(Product.slug == slug)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce slug est déjà utilisé.")
    sku = body.sku.strip() if body.sku else None
    if sku and db.scalar(select(Product).where(Product.sku == sku)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette référence existe déjà.")
    product = Product(
        name=body.name.strip(),
        slug=slug,
        sku=sku,
        description=body.description,
        category_id=body.category_id,
        is_new=body.is_new,
        is_featured=body.is_featured,
        is_active=body.is_active,
    )
    db.add(product)
    db.flush()
    for price in body.prices:
        upsert_zone_price(
            db,
            product_id=product.id,
            zone_id=price.zone_id,
            price_amount=price.price_amount,
            is_available=price.is_available,
        )
    for stock in body.stocks:
        set_zone_qty(db, product_id=product.id, zone_id=stock.zone_id, qty=stock.qty, actor_id=user.id)
    write_audit(db, actor=user, action="product.create", entity_type="product", entity_id=product.id)
    db.commit()
    return product_admin_out(db, load_product(db, product.id))


@router.get("/products/{product_id}")
def get_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("catalog:read")),
) -> dict:
    return product_admin_out(db, load_product(db, product_id))


@router.patch("/products/{product_id}")
def update_product(
    product_id: UUID,
    body: ProductPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("catalog:write")),
) -> dict:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable.")
    if body.name is not None:
        product.name = body.name.strip()
    if body.slug is not None:
        product.slug = body.slug
    elif body.name is not None:
        product.slug = unique_slug(db, body.name, product.id)
    if body.sku is not None:
        product.sku = body.sku.strip() or None
    if body.description is not None:
        product.description = body.description
    if body.category_id is not None:
        product.category_id = body.category_id
    if body.is_new is not None:
        product.is_new = body.is_new
    if body.is_featured is not None:
        product.is_featured = body.is_featured
    if body.is_active is not None:
        product.is_active = body.is_active
    if body.is_archived is not None:
        product.is_archived = body.is_archived
        if body.is_archived:
            product.is_active = False
    if body.prices:
        for price in body.prices:
            upsert_zone_price(
                db,
                product_id=product.id,
                zone_id=price.zone_id,
                price_amount=price.price_amount,
                is_available=price.is_available,
            )
    if body.stocks:
        for stock in body.stocks:
            set_zone_qty(db, product_id=product.id, zone_id=stock.zone_id, qty=stock.qty, actor_id=user.id)
    write_audit(db, actor=user, action="product.update", entity_type="product", entity_id=product.id)
    db.commit()
    return product_admin_out(db, load_product(db, product.id))


@router.post("/products/{product_id}/images")
def add_product_image(
    product_id: UUID,
    file_id: UUID = Query(...),
    as_primary: bool = Query(default=False),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("catalog:write")),
) -> dict:
    product = load_product(db, product_id)
    asset = db.get(FileAsset, file_id)
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichier introuvable.")
    attach_image(db, product, asset, as_primary=as_primary)
    write_audit(db, actor=user, action="product.image.add", entity_type="product", entity_id=product.id)
    db.commit()
    return product_admin_out(db, load_product(db, product.id))


@router.put("/products/{product_id}/images")
def reorder_product_images(
    product_id: UUID,
    body: list[ImageOrderIn],
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("catalog:write")),
) -> dict:
    product = load_product(db, product_id)
    by_id = {image.id: image for image in product.images}
    primary_set = False
    for item in body:
        image = by_id.get(item.id)
        if image is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image introuvable.")
        image.sort_order = item.sort_order
        image.is_primary = item.is_primary and not primary_set
        if image.is_primary:
            primary_set = True
    if not primary_set and product.images:
        first = sorted(product.images, key=lambda row: row.sort_order)[0]
        first.is_primary = True
    write_audit(db, actor=user, action="product.image.reorder", entity_type="product", entity_id=product.id)
    db.commit()
    return product_admin_out(db, load_product(db, product.id))


@router.delete("/products/{product_id}/images/{image_id}")
def delete_product_image(
    product_id: UUID,
    image_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("catalog:write")),
) -> dict:
    product = load_product(db, product_id)
    image = next((item for item in product.images if item.id == image_id), None)
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image introuvable.")
    was_primary = image.is_primary
    db.delete(image)
    db.flush()
    if was_primary:
        remaining = sorted([item for item in product.images if item.id != image_id], key=lambda row: row.sort_order)
        if remaining:
            remaining[0].is_primary = True
    write_audit(db, actor=user, action="product.image.delete", entity_type="product", entity_id=product.id)
    db.commit()
    return product_admin_out(db, load_product(db, product.id))
