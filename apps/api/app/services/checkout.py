"""Création publique de commande : le backend est la source de vérité."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.enums import (
    FeePolicy,
    FulfillmentMode,
    FulfillmentPaymentStatus,
    OrderStatus,
    ProductPaymentStatus,
)
from app.models import (
    Bundle,
    BundleZonePrice,
    CommercialZone,
    Customer,
    Order,
    OrderItem,
    Product,
    ProductImage,
    ProductZonePrice,
    ZoneFulfillmentMode,
)
from app.services.inventory import get_or_create_position
from app.services.pricing import bundle_buildable_qty
from app.core.storage import public_object_url


MODE_UNAVAILABLE = {
    FulfillmentMode.DELIVERY.value: "Les livraisons sont momentanément indisponibles.",
    FulfillmentMode.SHIPPING.value: "Les expéditions sont momentanément indisponibles.",
    FulfillmentMode.PICKUP.value: "Le retrait est momentanément indisponible.",
}


class CheckoutError(HTTPException):
    def __init__(self, message: str, code: int = status.HTTP_400_BAD_REQUEST) -> None:
        super().__init__(status_code=code, detail=message)


def normalize_phone(value: str) -> str:
    compact = "".join(ch for ch in value.strip() if ch.isdigit() or ch == "+")
    if compact.startswith("00"):
        compact = "+" + compact[2:]
    return compact


def validate_phone(value: str) -> str:
    compact = normalize_phone(value or "")
    digits = "".join(ch for ch in compact if ch.isdigit())
    if len(digits) < 8 or len(digits) > 15:
        raise CheckoutError("Merci d’indiquer un numéro de téléphone valide.")
    return compact


def validate_name(value: str) -> str:
    name = " ".join((value or "").split())
    if len(name) < 2:
        raise CheckoutError("Merci d’indiquer votre nom et prénom.")
    return name


def fulfillment_on_create(row: ZoneFulfillmentMode) -> tuple[int, str, bool]:
    """Retourne (montant, statut paiement réception, frais connus). Jamais PAID."""
    if row.mode == FulfillmentMode.PICKUP.value:
        return 0, FulfillmentPaymentStatus.NOT_APPLICABLE.value, True
    if row.fee_policy == FeePolicy.NONE.value:
        return 0, FulfillmentPaymentStatus.NOT_APPLICABLE.value, True
    if row.fee_policy == FeePolicy.DEFAULT.value and row.default_fee_amount is not None:
        return (
            int(row.default_fee_amount),
            FulfillmentPaymentStatus.DUE_ON_FULFILLMENT.value,
            True,
        )
    return 0, FulfillmentPaymentStatus.DUE_ON_FULFILLMENT.value, False


def load_zone(db: Session, slug: str) -> CommercialZone:
    zone = db.scalar(
        select(CommercialZone)
        .options(
            joinedload(CommercialZone.currency),
            joinedload(CommercialZone.fulfillment_modes),
        )
        .where(CommercialZone.slug == slug, CommercialZone.is_active.is_(True))
    )
    if zone is None:
        raise CheckoutError("Cette zone n’est pas disponible.", status.HTTP_404_NOT_FOUND)
    return zone


def enabled_mode(zone: CommercialZone, mode: str) -> ZoneFulfillmentMode:
    try:
        FulfillmentMode(mode)
    except ValueError as exc:
        raise CheckoutError("Mode de réception inconnu.") from exc
    row = next((item for item in zone.fulfillment_modes if item.mode == mode), None)
    if row is None or not row.is_enabled:
        raise CheckoutError(MODE_UNAVAILABLE.get(mode, "Ce mode de réception n’est pas disponible."))
    return row


def validate_address(mode: str, *, city: str | None, neighborhood: str | None) -> tuple[str | None, str | None]:
    city_clean = " ".join((city or "").split()) or None
    neighborhood_clean = " ".join((neighborhood or "").split()) or None
    if mode == FulfillmentMode.DELIVERY.value:
        if not neighborhood_clean:
            raise CheckoutError("Merci d’indiquer le quartier pour la livraison.")
        return None, neighborhood_clean
    if mode == FulfillmentMode.SHIPPING.value:
        if not city_clean:
            raise CheckoutError("Merci d’indiquer la ville pour l’expédition.")
        return city_clean, None
    return None, None


def _product_thumb(product: Product) -> str | None:
    if not product.images:
        return None
    ordered = sorted(product.images, key=lambda item: (not item.is_primary, item.sort_order))
    chosen = ordered[0]
    if chosen.file is None or not chosen.file.storage_key:
        return None
    return public_object_url(chosen.file.storage_key)


def quote_items(db: Session, zone: CommercialZone, items: list[dict]) -> tuple[list[dict], int, bool]:
    if not items:
        raise CheckoutError("Votre panier est vide.")
    lines: list[dict] = []
    products_amount = 0
    can_submit = True
    for raw in items:
        quantity = int(raw.get("quantity") or 0)
        product_id = raw.get("product_id")
        bundle_id = raw.get("bundle_id")
        if quantity < 1:
            can_submit = False
            lines.append(
                {
                    "kind": "product" if product_id else "pack",
                    "id": str(product_id or bundle_id or ""),
                    "ok": False,
                    "issue": "La quantité n’est pas valide.",
                    "quantity": quantity,
                    "max_quantity": 0,
                    "unit_price": 0,
                    "list_price": 0,
                    "line_total": 0,
                    "promo_active": False,
                    "name": "",
                    "slug": "",
                    "image_url": None,
                }
            )
            continue
        if bool(product_id) == bool(bundle_id):
            raise CheckoutError("Chaque ligne doit concerner un produit ou un pack.")
        try:
            if product_id:
                line = _quote_product(db, zone, UUID(str(product_id)), quantity)
            else:
                line = _quote_pack(db, zone, UUID(str(bundle_id)), quantity)
        except (ValueError, TypeError):
            line = _fail_line(
                "product" if product_id else "pack",
                str(product_id or bundle_id or ""),
                quantity,
                "Cette ligne n’est plus disponible.",
            )
        if not line["ok"]:
            can_submit = False
        else:
            products_amount += line["line_total"]
        lines.append(line)
    return lines, products_amount, can_submit


def _quote_product(db: Session, zone: CommercialZone, product_id: UUID, quantity: int) -> dict:
    product = db.scalar(
        select(Product)
        .options(joinedload(Product.images).joinedload(ProductImage.file))
        .where(Product.id == product_id)
    )
    if product is None or not product.is_active or product.is_archived:
        return _fail_line("product", str(product_id), quantity, "Ce produit n’est plus disponible.")
    price = db.scalar(
        select(ProductZonePrice).where(
            ProductZonePrice.product_id == product.id,
            ProductZonePrice.zone_id == zone.id,
            ProductZonePrice.is_available.is_(True),
        )
    )
    if price is None:
        return _fail_line(
            "product",
            str(product.id),
            quantity,
            "Ce produit n’est pas proposé dans cette zone.",
            name=product.name,
            slug=product.slug,
        )
    position = get_or_create_position(db, product.id, zone.id)
    max_qty = max(0, position.qty)
    promo_active = bool(price.promo_is_active and price.promo_price_amount is not None)
    unit = price.selling_price
    ok = max_qty > 0 and quantity <= max_qty
    issue = None
    if max_qty <= 0:
        issue = "Ce produit est en rupture de stock."
    elif quantity > max_qty:
        issue = f"Le stock disponible est de {max_qty}. Merci d’ajuster la quantité."
    return {
        "kind": "product",
        "id": str(product.id),
        "slug": product.slug,
        "name": product.name,
        "image_url": _product_thumb(product),
        "quantity": quantity,
        "max_quantity": max_qty,
        "list_price": price.price_amount,
        "unit_price": unit,
        "promo_active": promo_active,
        "line_total": unit * quantity if ok else 0,
        "ok": ok,
        "issue": issue,
    }


def _quote_pack(db: Session, zone: CommercialZone, bundle_id: UUID, quantity: int) -> dict:
    bundle = db.get(Bundle, bundle_id)
    if bundle is None or not bundle.is_active or bundle.is_archived:
        return _fail_line("pack", str(bundle_id), quantity, "Ce pack n’est plus disponible.")
    price = db.scalar(
        select(BundleZonePrice).where(
            BundleZonePrice.bundle_id == bundle.id,
            BundleZonePrice.zone_id == zone.id,
            BundleZonePrice.is_available.is_(True),
        )
    )
    if price is None:
        return _fail_line(
            "pack",
            str(bundle.id),
            quantity,
            "Ce pack n’est pas proposé dans cette zone.",
            name=bundle.name,
            slug=bundle.slug,
        )
    max_qty = bundle_buildable_qty(db, bundle, zone.id)
    promo_active = bool(price.promo_is_active and price.promo_price_amount is not None)
    unit = price.selling_price
    ok = max_qty > 0 and quantity <= max_qty
    issue = None
    if max_qty <= 0:
        issue = "Ce pack ne peut pas être constitué : un soin est en rupture."
    elif quantity > max_qty:
        issue = f"Seulement {max_qty} pack(s) peuvent être constitués. Merci d’ajuster la quantité."
    return {
        "kind": "pack",
        "id": str(bundle.id),
        "slug": bundle.slug,
        "name": bundle.name,
        "image_url": None,
        "quantity": quantity,
        "max_quantity": max_qty,
        "list_price": price.price_amount,
        "unit_price": unit,
        "promo_active": promo_active,
        "line_total": unit * quantity if ok else 0,
        "ok": ok,
        "issue": issue,
    }


def _fail_line(
    kind: str,
    item_id: str,
    quantity: int,
    issue: str,
    *,
    name: str = "",
    slug: str = "",
) -> dict:
    return {
        "kind": kind,
        "id": item_id,
        "slug": slug,
        "name": name,
        "image_url": None,
        "quantity": quantity,
        "max_quantity": 0,
        "list_price": 0,
        "unit_price": 0,
        "promo_active": False,
        "line_total": 0,
        "ok": False,
        "issue": issue,
    }


def allocate_order_number(db: Session, zone_slug: str) -> str:
    day = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"ON-{zone_slug[:2].upper()}-{day}-"
    for _ in range(12):
        candidate = prefix + secrets.token_hex(2).upper()
        exists = db.scalar(select(Order.id).where(Order.number == candidate))
        if exists is None:
            return candidate
    raise CheckoutError("Impossible d’attribuer un numéro de commande.", status.HTTP_503_SERVICE_UNAVAILABLE)


def upsert_customer(db: Session, *, name: str, phone: str, zone_id: UUID) -> Customer:
    customer = db.scalar(select(Customer).where(Customer.phone == phone))
    if customer is None:
        customer = Customer(full_name=name, phone=phone, last_zone_id=zone_id)
        db.add(customer)
        db.flush()
        return customer
    customer.full_name = name
    customer.last_zone_id = zone_id
    return customer


def create_public_order(
    db: Session,
    *,
    zone_slug: str,
    fulfillment_mode: str,
    customer_name: str,
    customer_phone: str,
    city: str | None,
    neighborhood: str | None,
    items: list[dict],
) -> Order:
    zone = load_zone(db, zone_slug)
    mode_row = enabled_mode(zone, fulfillment_mode)
    name = validate_name(customer_name)
    phone = validate_phone(customer_phone)
    city_clean, neighborhood_clean = validate_address(
        fulfillment_mode, city=city, neighborhood=neighborhood
    )
    quoted, products_amount, can_submit = quote_items(db, zone, items)
    if not can_submit:
        first = next((line["issue"] for line in quoted if line.get("issue")), None)
        raise CheckoutError(first or "Merci de corriger votre panier avant d’envoyer la commande.")
    fee_amount, fee_status, _known = fulfillment_on_create(mode_row)
    customer = upsert_customer(db, name=name, phone=phone, zone_id=zone.id)
    order = Order(
        number=allocate_order_number(db, zone.slug),
        zone_id=zone.id,
        currency_id=zone.currency_id,
        currency_code=zone.currency.code,
        status=OrderStatus.NEW.value,
        customer_id=customer.id,
        customer_name=name,
        customer_phone=phone,
        fulfillment_mode=fulfillment_mode,
        city=city_clean,
        neighborhood=neighborhood_clean,
        products_amount=products_amount,
        fulfillment_fee_amount=fee_amount,
        products_payment_status=ProductPaymentStatus.PENDING.value,
        fulfillment_payment_status=fee_status,
        stock_decremented_at=None,
        created_by_id=None,
    )
    db.add(order)
    db.flush()
    for line in quoted:
        item = OrderItem(
            order_id=order.id,
            product_id=UUID(line["id"]) if line["kind"] == "product" else None,
            bundle_id=UUID(line["id"]) if line["kind"] == "pack" else None,
            name_snapshot=line["name"],
            unit_price_snapshot=line["unit_price"],
            quantity=line["quantity"],
            line_total=line["line_total"],
        )
        db.add(item)
    db.commit()
    db.refresh(order)
    return order
