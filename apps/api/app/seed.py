"""Seed idempotent : devises, zones Cameroun/Europe, modes, comptes, réglages."""

from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.enums import FeePolicy, FulfillmentMode, UserRole
from app.core.security import hash_password
from app.models import CommercialZone, Currency, Setting, User, ZoneFulfillmentMode

MODE_LABELS = {
    FulfillmentMode.DELIVERY: "Livraison",
    FulfillmentMode.SHIPPING: "Expédition",
    FulfillmentMode.PICKUP: "Retrait",
}

CATEGORY_SEEDS = [
    ("cosmetique-bio", "Cosmétique bio", 10),
    ("cosmetique-spirituelle", "Cosmétique spirituelle", 20),
    ("plantes-epices", "Plantes & épices", 30),
    ("huiles-vegetales", "Huiles végétales", 40),
    ("huiles-essentielles", "Huiles essentielles", 50),
    ("poudres-indiennes", "Poudres indiennes", 60),
    ("savons", "Savons", 70),
    ("gommages", "Gommages", 80),
    ("rituels", "Rituels", 90),
    ("parfums", "Parfums", 100),
    ("sacs-a-main", "Sacs à main", 110),
    ("accessoires", "Accessoires", 120),
    ("packs", "Packs", 130),
]


def seed() -> None:
    settings = get_settings()
    db = SessionLocal()
    try:
        xaf = _get_or_create_currency(db, "XAF", "Franc CFA", "FCFA", 0)
        eur = _get_or_create_currency(db, "EUR", "Euro", "€", 2)
        cameroun = _get_or_create_zone(db, slug="cameroun", name="Cameroun", currency=xaf, sort_order=10)
        europe = _get_or_create_zone(db, slug="europe", name="Europe", currency=eur, sort_order=20)
        for zone in (cameroun, europe):
            for mode in FulfillmentMode:
                _ensure_mode(db, zone, mode)
        _ensure_user(
            db,
            email=settings.owner_email.lower(),
            password=settings.owner_password,
            full_name=settings.owner_name,
            role=UserRole.OWNER,
            zone_id=None,
        )
        _ensure_user(
            db,
            email=settings.seller_email.lower(),
            password=settings.seller_password,
            full_name=settings.seller_name,
            role=UserRole.SELLER,
            zone_id=cameroun.id,
        )
        _ensure_setting(db, "default_low_stock_threshold", {"value": 5})
        _ensure_setting(db, "whatsapp_number", {"value": None})
        _ensure_setting(db, "brand", {"name": "O'Naturelle", "since": 2012})
        _seed_categories(db)
        from app.catalog_seed import sync as sync_catalog

        db.commit()
        print("Seed O'Naturelle OK — zones Cameroun / Europe, OWNER + SELLER.")
        sync_catalog()
    finally:
        db.close()


def _get_or_create_currency(db, code: str, name: str, symbol: str, minor_units: int) -> Currency:
    row = db.scalar(select(Currency).where(Currency.code == code))
    if row is None:
        row = Currency(code=code, name=name, symbol=symbol, minor_units=minor_units)
        db.add(row)
        db.flush()
    return row


def _get_or_create_zone(db, slug: str, name: str, currency: Currency, sort_order: int) -> CommercialZone:
    row = db.scalar(select(CommercialZone).where(CommercialZone.slug == slug))
    if row is None:
        row = CommercialZone(
            slug=slug,
            name=name,
            is_active=True,
            currency_id=currency.id,
            sort_order=sort_order,
        )
        db.add(row)
        db.flush()
    return row


def _ensure_mode(db, zone: CommercialZone, mode: FulfillmentMode) -> None:
    existing = db.scalar(
        select(ZoneFulfillmentMode).where(
            ZoneFulfillmentMode.zone_id == zone.id,
            ZoneFulfillmentMode.mode == mode.value,
        )
    )
    if existing is None:
        db.add(
            ZoneFulfillmentMode(
                zone_id=zone.id,
                mode=mode.value,
                label=MODE_LABELS[mode],
                is_enabled=True,
                fee_policy=FeePolicy.SET_AT_PROCESSING.value,
                default_fee_amount=None,
            )
        )


def _ensure_user(db, email: str, password: str, full_name: str, role: UserRole, zone_id) -> None:
    row = db.scalar(select(User).where(User.email == email))
    if row is None:
        db.add(
            User(
                email=email,
                hashed_password=hash_password(password),
                full_name=full_name,
                role=role.value,
                assigned_zone_id=zone_id,
                is_active=True,
            )
        )


def _ensure_setting(db, key: str, value: dict) -> None:
    row = db.get(Setting, key)
    if row is None:
        db.add(Setting(key=key, value=value))


def _seed_categories(db) -> None:
    from app.models import Category

    for slug, name, order in CATEGORY_SEEDS:
        existing = db.scalar(select(Category).where(Category.slug == slug))
        if existing is None:
            db.add(Category(slug=slug, name=name, sort_order=order, is_visible=True))


if __name__ == "__main__":
    seed()
