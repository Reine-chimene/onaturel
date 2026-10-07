from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.storage import public_object_url
from app.models import (
    Bundle,
    BundleZonePrice,
    Category,
    CommercialZone,
    InventoryPosition,
    Order,
    Product,
    ProductImage,
    ProductZonePrice,
)
from app.services.inventory import default_low_stock_threshold, stock_status
from app.services.pricing import bundle_buildable_qty

router = APIRouter(prefix="/public", tags=["public"])


class PublicCategory(BaseModel):
    slug: str
    name: str


class PublicProduct(BaseModel):
    id: str
    slug: str
    name: str
    is_new: bool
    is_featured: bool
    price: int
    promo_price: int | None
    promo_active: bool
    currency_code: str
    stock_status: str
    available: bool
    category_slug: str | None = None
    category_name: str | None = None
    image_url: str | None = None


class PublicPack(BaseModel):
    id: str
    slug: str
    name: str
    description: str | None = None
    price: int
    promo_price: int | None = None
    promo_active: bool = False
    currency_code: str
    available: bool
    available_qty: int = 0


class PublicShop(BaseModel):
    zone_slug: str
    zone_name: str
    currency_code: str
    categories: list[PublicCategory]
    products: list[PublicProduct]
    packs: list[PublicPack]


def _product_image_urls(product: Product) -> list[str]:
    if not product.images:
        return []
    ordered = sorted(product.images, key=lambda item: (not item.is_primary, item.sort_order))
    urls: list[str] = []
    for image in ordered:
        if image.file is None or not image.file.storage_key:
            continue
        urls.append(public_object_url(image.file.storage_key))
    return urls


def _category_scope_ids(db: Session, slug: str) -> list[UUID] | None:
    """Exact category + direct children. None = slug unknown (empty result, never all products)."""
    row = db.scalar(select(Category).where(Category.slug == slug))
    if row is None:
        return None
    child_ids = db.scalars(select(Category.id).where(Category.parent_id == row.id)).all()
    return [row.id, *child_ids]


@router.get("/shop", response_model=PublicShop)
def public_shop(
    zone: str = Query(..., min_length=2, max_length=64),
    category: str | None = Query(None, min_length=2, max_length=128),
    db: Session = Depends(get_db),
) -> PublicShop:
    commercial_zone = db.scalar(
        select(CommercialZone)
        .options(joinedload(CommercialZone.currency))
        .where(CommercialZone.slug == zone, CommercialZone.is_active.is_(True))
    )
    if commercial_zone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone indisponible.")

    threshold = default_low_stock_threshold(db)
    currency = commercial_zone.currency.code

    categories = [
        PublicCategory(slug=item.slug, name=item.name)
        for item in db.scalars(
            select(Category)
            .where(Category.is_visible.is_(True))
            .order_by(Category.sort_order, Category.name)
        ).all()
    ]

    products_out: list[PublicProduct] = []
    catalog_stmt = (
        select(Product)
        .options(
            joinedload(Product.category),
            joinedload(Product.images).joinedload(ProductImage.file),
        )
        .where(Product.is_active.is_(True), Product.is_archived.is_(False))
    )
    if category:
        scope = _category_scope_ids(db, category)
        if scope is None:
            catalog = []
        else:
            catalog_stmt = catalog_stmt.where(Product.category_id.in_(scope))
            catalog = db.scalars(catalog_stmt).unique().all()
    else:
        catalog = db.scalars(catalog_stmt).unique().all()

    for product in catalog:
        price = db.scalar(
            select(ProductZonePrice).where(
                ProductZonePrice.product_id == product.id,
                ProductZonePrice.zone_id == commercial_zone.id,
                ProductZonePrice.is_available.is_(True),
            )
        )
        if price is None:
            continue
        position = db.scalar(
            select(InventoryPosition).where(
                InventoryPosition.product_id == product.id,
                InventoryPosition.zone_id == commercial_zone.id,
            )
        )
        qty = 0 if position is None else position.qty
        low = (
            position.low_stock_threshold
            if position is not None and position.low_stock_threshold is not None
            else threshold
        )
        promo_active = bool(price.promo_is_active and price.promo_price_amount is not None)
        images = _product_image_urls(product)
        products_out.append(
            PublicProduct(
                id=str(product.id),
                slug=product.slug,
                name=product.name,
                is_new=product.is_new,
                is_featured=product.is_featured,
                price=price.price_amount,
                promo_price=price.promo_price_amount if promo_active else None,
                promo_active=promo_active,
                currency_code=currency,
                stock_status=stock_status(qty, low).value,
                available=qty > 0,
                category_slug=product.category.slug if product.category else None,
                category_name=product.category.name if product.category else None,
                image_url=images[0] if images else None,
            )
        )

    packs_out: list[PublicPack] = []
    if not category:
        pack_prices = db.scalars(
            select(BundleZonePrice).where(
                BundleZonePrice.zone_id == commercial_zone.id,
                BundleZonePrice.is_available.is_(True),
            )
        ).all()
        for pack_price in pack_prices:
            bundle = db.get(Bundle, pack_price.bundle_id)
            if bundle is None or not bundle.is_active or bundle.is_archived:
                continue
            promo_active = bool(pack_price.promo_is_active and pack_price.promo_price_amount is not None)
            qty = bundle_buildable_qty(db, bundle, commercial_zone.id)
            packs_out.append(
                PublicPack(
                    id=str(bundle.id),
                    slug=bundle.slug,
                    name=bundle.name,
                    description=bundle.description,
                    price=pack_price.price_amount,
                    promo_price=pack_price.promo_price_amount if promo_active else None,
                    promo_active=promo_active,
                    currency_code=currency,
                    available=qty > 0,
                    available_qty=qty,
                )
            )

    return PublicShop(
        zone_slug=commercial_zone.slug,
        zone_name=commercial_zone.name,
        currency_code=currency,
        categories=categories,
        products=products_out,
        packs=packs_out,
    )


class PublicProductDetail(BaseModel):
    id: str
    slug: str
    name: str
    description: str | None
    is_new: bool
    category_slug: str | None
    category_name: str | None
    images: list[str]
    offered: bool
    available: bool
    qty: int
    stock_status: str
    price: int | None
    promo_price: int | None
    promo_active: bool
    currency_code: str
    related: list[PublicProduct]


def _zone_or_404(db: Session, zone: str) -> CommercialZone:
    commercial_zone = db.scalar(
        select(CommercialZone)
        .options(joinedload(CommercialZone.currency))
        .where(CommercialZone.slug == zone, CommercialZone.is_active.is_(True))
    )
    if commercial_zone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone indisponible.")
    return commercial_zone


def _as_public_product(
    product: Product,
    *,
    price: ProductZonePrice,
    qty: int,
    stock: str,
    currency: str,
) -> PublicProduct:
    images = _product_image_urls(product)
    promo_active = bool(price.promo_is_active and price.promo_price_amount is not None)
    return PublicProduct(
        id=str(product.id),
        slug=product.slug,
        name=product.name,
        is_new=product.is_new,
        is_featured=product.is_featured,
        price=price.price_amount,
        promo_price=price.promo_price_amount if promo_active else None,
        promo_active=promo_active,
        currency_code=currency,
        stock_status=stock,
        available=qty > 0,
        category_slug=product.category.slug if product.category else None,
        category_name=product.category.name if product.category else None,
        image_url=images[0] if images else None,
    )


def _zone_stock(db: Session, product_id, zone_id, threshold: int) -> tuple[int, str]:
    position = db.scalar(
        select(InventoryPosition).where(
            InventoryPosition.product_id == product_id,
            InventoryPosition.zone_id == zone_id,
        )
    )
    qty = 0 if position is None else position.qty
    low = (
        position.low_stock_threshold
        if position is not None and position.low_stock_threshold is not None
        else threshold
    )
    return qty, stock_status(qty, low).value


@router.get("/products/{slug}", response_model=PublicProductDetail)
def public_product(
    slug: str,
    zone: str = Query(..., min_length=2, max_length=64),
    db: Session = Depends(get_db),
) -> PublicProductDetail:
    commercial_zone = _zone_or_404(db, zone)
    threshold = default_low_stock_threshold(db)
    currency = commercial_zone.currency.code

    product = db.scalar(
        select(Product)
        .options(
            joinedload(Product.category),
            joinedload(Product.images).joinedload(ProductImage.file),
        )
        .where(
            Product.slug == slug,
            Product.is_active.is_(True),
            Product.is_archived.is_(False),
        )
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable.")

    price = db.scalar(
        select(ProductZonePrice).where(
            ProductZonePrice.product_id == product.id,
            ProductZonePrice.zone_id == commercial_zone.id,
            ProductZonePrice.is_available.is_(True),
        )
    )
    qty, status_label = _zone_stock(db, product.id, commercial_zone.id, threshold)
    offered = price is not None
    promo_active = bool(offered and price.promo_is_active and price.promo_price_amount is not None)
    description = product.description.strip() if product.description and product.description.strip() else None

    related_out: list[PublicProduct] = []
    seen: set = {product.id}

    def collect(category_id=None) -> None:
        stmt = (
            select(Product)
            .join(
                ProductZonePrice,
                (ProductZonePrice.product_id == Product.id)
                & (ProductZonePrice.zone_id == commercial_zone.id)
                & (ProductZonePrice.is_available.is_(True)),
            )
            .options(
                joinedload(Product.category),
                joinedload(Product.images).joinedload(ProductImage.file),
            )
            .where(
                Product.is_active.is_(True),
                Product.is_archived.is_(False),
                Product.id != product.id,
            )
            .order_by(Product.is_featured.desc(), Product.name)
        )
        if category_id is not None:
            stmt = stmt.where(Product.category_id == category_id)
        for other in db.scalars(stmt.limit(8)).unique().all():
            if other.id in seen or len(related_out) >= 4:
                continue
            other_price = db.scalar(
                select(ProductZonePrice).where(
                    ProductZonePrice.product_id == other.id,
                    ProductZonePrice.zone_id == commercial_zone.id,
                    ProductZonePrice.is_available.is_(True),
                )
            )
            if other_price is None:
                continue
            other_qty, other_status = _zone_stock(db, other.id, commercial_zone.id, threshold)
            seen.add(other.id)
            related_out.append(
                _as_public_product(
                    other,
                    price=other_price,
                    qty=other_qty,
                    stock=other_status,
                    currency=currency,
                )
            )

    if product.category_id is not None:
        collect(product.category_id)

    return PublicProductDetail(
        id=str(product.id),
        slug=product.slug,
        name=product.name,
        description=description,
        is_new=product.is_new,
        category_slug=product.category.slug if product.category else None,
        category_name=product.category.name if product.category else None,
        images=_product_image_urls(product),
        offered=offered,
        available=offered and qty > 0,
        qty=qty if offered else 0,
        stock_status=status_label if offered else "OUT_OF_STOCK",
        price=price.price_amount if offered else None,
        promo_price=price.promo_price_amount if promo_active else None,
        promo_active=promo_active,
        currency_code=currency,
        related=related_out,
    )


class PublicFulfillmentMode(BaseModel):
    mode: str
    label: str
    is_enabled: bool
    fee_policy: str
    default_fee_amount: int | None
    fee_amount: int
    fee_known: bool
    fee_payment_status: str


class PublicCheckoutConfig(BaseModel):
    zone_slug: str
    zone_name: str
    currency_code: str
    fulfillment_modes: list[PublicFulfillmentMode]


class PublicCartItemIn(BaseModel):
    product_id: str | None = None
    bundle_id: str | None = None
    quantity: int


class PublicQuoteLine(BaseModel):
    kind: str
    id: str
    slug: str
    name: str
    image_url: str | None
    quantity: int
    max_quantity: int
    list_price: int
    unit_price: int
    promo_active: bool
    line_total: int
    ok: bool
    issue: str | None


class PublicQuote(BaseModel):
    zone_slug: str
    currency_code: str
    products_amount: int
    can_submit: bool
    lines: list[PublicQuoteLine]


class PublicQuoteIn(BaseModel):
    zone: str
    items: list[PublicCartItemIn]


class PublicOrderCreate(PublicQuoteIn):
    fulfillment_mode: str
    customer_name: str
    customer_phone: str
    city: str | None = None
    neighborhood: str | None = None
    fulfillment_mode: str
    customer_name: str
    customer_phone: str
    city: str | None = None
    neighborhood: str | None = None


class PublicOrderItemOut(BaseModel):
    kind: str
    name: str
    quantity: int
    unit_price: int
    line_total: int


class PublicOrderOut(BaseModel):
    number: str
    status: str
    zone_slug: str
    zone_name: str
    currency_code: str
    customer_name: str
    customer_phone: str
    fulfillment_mode: str
    fulfillment_label: str
    city: str | None
    neighborhood: str | None
    products_amount: int
    fulfillment_fee_amount: int
    fee_known: bool
    products_payment_status: str
    fulfillment_payment_status: str
    pay_now_amount: int
    items: list[PublicOrderItemOut]


def _item_dicts(items: list[PublicCartItemIn]) -> list[dict]:
    return [
        {
            "product_id": item.product_id,
            "bundle_id": item.bundle_id,
            "quantity": item.quantity,
        }
        for item in items
    ]


def _mode_payload(row) -> PublicFulfillmentMode:
    from app.services.checkout import fulfillment_on_create

    fee_amount, fee_status, fee_known = fulfillment_on_create(row)
    return PublicFulfillmentMode(
        mode=row.mode,
        label=row.label,
        is_enabled=row.is_enabled,
        fee_policy=row.fee_policy,
        default_fee_amount=row.default_fee_amount,
        fee_amount=fee_amount,
        fee_known=fee_known,
        fee_payment_status=fee_status,
    )


def _order_out(order, zone) -> PublicOrderOut:
    labels = {item.mode: item.label for item in zone.fulfillment_modes}
    fee_known = order.fulfillment_payment_status == "NOT_APPLICABLE" or order.fulfillment_fee_amount > 0
    return PublicOrderOut(
        number=order.number,
        status=order.status,
        zone_slug=zone.slug,
        zone_name=zone.name,
        currency_code=order.currency_code,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        fulfillment_mode=order.fulfillment_mode,
        fulfillment_label=labels.get(order.fulfillment_mode, order.fulfillment_mode),
        city=order.city,
        neighborhood=order.neighborhood,
        products_amount=order.products_amount,
        fulfillment_fee_amount=order.fulfillment_fee_amount,
        fee_known=fee_known,
        products_payment_status=order.products_payment_status,
        fulfillment_payment_status=order.fulfillment_payment_status,
        pay_now_amount=order.products_amount,
        items=[
            PublicOrderItemOut(
                kind="pack" if item.bundle_id else "product",
                name=item.name_snapshot,
                quantity=item.quantity,
                unit_price=item.unit_price_snapshot,
                line_total=item.line_total,
            )
            for item in order.items
        ],
    )


@router.get("/checkout", response_model=PublicCheckoutConfig)
def public_checkout_config(
    zone: str = Query(..., min_length=2, max_length=64),
    db: Session = Depends(get_db),
) -> PublicCheckoutConfig:
    from app.services.checkout import load_zone

    commercial_zone = load_zone(db, zone)
    modes = sorted(commercial_zone.fulfillment_modes, key=lambda item: item.mode)
    return PublicCheckoutConfig(
        zone_slug=commercial_zone.slug,
        zone_name=commercial_zone.name,
        currency_code=commercial_zone.currency.code,
        fulfillment_modes=[_mode_payload(item) for item in modes],
    )


@router.post("/cart/quote", response_model=PublicQuote)
def public_cart_quote(
    body: PublicQuoteIn,
    db: Session = Depends(get_db),
) -> PublicQuote:
    from app.services.checkout import load_zone, quote_items

    if not body.items:
        commercial_zone = load_zone(db, body.zone)
        return PublicQuote(
            zone_slug=commercial_zone.slug,
            currency_code=commercial_zone.currency.code,
            products_amount=0,
            can_submit=False,
            lines=[],
        )
    commercial_zone = load_zone(db, body.zone)
    lines, products_amount, can_submit = quote_items(db, commercial_zone, _item_dicts(body.items))
    return PublicQuote(
        zone_slug=commercial_zone.slug,
        currency_code=commercial_zone.currency.code,
        products_amount=products_amount,
        can_submit=can_submit,
        lines=[PublicQuoteLine(**line) for line in lines],
    )


@router.post("/orders", response_model=PublicOrderOut)
def public_create_order(body: PublicOrderCreate, db: Session = Depends(get_db)) -> PublicOrderOut:
    from app.services.checkout import create_public_order, load_zone

    order = create_public_order(
        db,
        zone_slug=body.zone,
        fulfillment_mode=body.fulfillment_mode,
        customer_name=body.customer_name,
        customer_phone=body.customer_phone,
        city=body.city,
        neighborhood=body.neighborhood,
        items=_item_dicts(body.items),
    )
    loaded = db.scalar(
        select(Order).options(joinedload(Order.items)).where(Order.id == order.id)
    )
    if loaded is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Votre commande a bien été enregistrée. Merci de contacter O’Naturelle pour la confirmation.",
        )
    zone = load_zone(db, body.zone)
    return _order_out(loaded, zone)


@router.get("/orders/{number}", response_model=PublicOrderOut)
def public_get_order(number: str, db: Session = Depends(get_db)) -> PublicOrderOut:
    order = db.scalar(select(Order).options(joinedload(Order.items)).where(Order.number == number))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable.")
    zone = db.scalar(
        select(CommercialZone)
        .options(joinedload(CommercialZone.fulfillment_modes), joinedload(CommercialZone.currency))
        .where(CommercialZone.id == order.zone_id)
    )
    if zone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable.")
    return _order_out(order, zone)
