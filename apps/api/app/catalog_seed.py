"""Synchronise le catalogue commercial O’Naturelle (idempotent).

Ne crée pas de prix Europe (non communiqués).
Ne crée pas L’Olive Noire (conflit 5 000 / 7 500 FCFA).
Les composants du pack ne sont pas vendus au détail.
Aucune photo produit n’est associée (aucune photo SKU vérifiée).
"""

from __future__ import annotations

from sqlalchemy import select

from app.core.db import SessionLocal
from app.models import (
    Bundle,
    BundleItem,
    BundleZonePrice,
    Category,
    CommercialZone,
    InventoryPosition,
    Product,
    ProductZonePrice,
)

CATEGORIES = [
    ("cosmetique-bio", "Cosmétique bio", 10, True),
    ("cosmetique-spirituelle", "Cosmétique spirituelle", 20, True),
    ("produits-spirituels-intense", "Produits spirituels intense", 30, True),
    ("produits-capillaires", "Produits capillaires", 40, True),
    ("gommages", "Gommages", 50, True),
    ("diete", "Diète", 60, True),
    ("divers", "Divers", 70, True),
    ("plantes-epices", "Plantes & épices", 80, True),
    ("huiles-vegetales", "Huiles végétales", 90, True),
    ("huiles-essentielles", "Huiles essentielles", 100, True),
    ("poudres-indiennes", "Poudres indiennes", 110, True),
    ("savons", "Savons", 120, True),
    ("rituels", "Rituels", 130, True),
    ("parfums", "Parfums", 140, True),
    ("sacs-accessoires", "Sacs & Accessoires", 150, True),
    ("accessoires", "Accessoires", 160, True),
    ("packs", "Packs", 170, False),
]

# slug, name, category_slug, xaf, description, featured, pack_only
PRODUCTS: list[tuple[str, str, str, int | None, str | None, bool, bool]] = [
    ("serum-vit-c", "Sérum Vit C", "cosmetique-bio", 1500, None, True, False),
    (
        "eponge-au-curcuma",
        "Éponge au curcuma",
        "cosmetique-bio",
        1000,
        "3 pièces.",
        False,
        False,
    ),
    (
        "mask-sheet-mix",
        "Mask Sheet Mix",
        "cosmetique-bio",
        1000,
        "Lot de 4.",
        False,
        False,
    ),
    ("ampoule-hair-grow", "Ampoule Hair Grow", "produits-capillaires", 500, None, False, False),
    ("magic-hair-shampoo", "Magic Hair Shampoo", "produits-capillaires", 2000, None, False, False),
    ("magic-hair-mask", "Magic Hair Mask", "produits-capillaires", 2000, None, False, False),
    (
        "magic-oil-kids-60ml",
        "Magic Oil Kids",
        "produits-capillaires",
        1500,
        "60 ml.",
        False,
        False,
    ),
    ("dub-oil", "Dub Oil", "produits-capillaires", 1500, None, False, False),
    (
        "detox-salt-coffee-300g",
        "Detox Salt Coffee",
        "gommages",
        1500,
        "300 g.",
        False,
        False,
    ),
    ("gant-kessa", "Gant Kessa", "gommages", 1000, None, False, False),
    ("peeling-foot-mask", "Peeling Foot Mask", "gommages", 1500, None, False, False),
    ("peeling-hand-mask", "Peeling Hand Mask", "gommages", 1000, None, False, False),
    ("ovules", "Ovules", "diete", 1000, "3 pièces.", False, False),
    (
        "the-my-detox-500ml",
        "The My Detox",
        "diete",
        1500,
        "500 ml. À diluer dans 1 L.",
        False,
        False,
    ),
    (
        "detox-concentre-250ml",
        "Detox Concentré 250 ml",
        "diete",
        5500,
        "250 ml. 3 à 4 L.",
        False,
        False,
    ),
    (
        "detox-concentre-500ml",
        "Detox Concentré 500 ml",
        "diete",
        10000,
        "500 ml. 5 à 7 L.",
        False,
        False,
    ),
    (
        "gelules-my-detox-30",
        "Gélules My Detox",
        "diete",
        1500,
        "30 gélules.",
        False,
        False,
    ),
    (
        "shilajit-resine-50g",
        "Shilajit Résine",
        "diete",
        2500,
        "50 g.",
        False,
        False,
    ),
    ("nila-powder", "Nila Powder", "divers", 1000, None, False, False),
    ("deo-stick-alun", "Deo Stick à l'Alun", "divers", 1000, None, False, False),
    (
        "trio-bisou-vole",
        "Trio Bisou Volé",
        "divers",
        1000,
        "Scrub, lips, 2 mask.",
        False,
        False,
    ),
    (
        "preservatifs-fruites-12",
        "Lot de 12 Préservatifs Fruités",
        "divers",
        1500,
        None,
        False,
        False,
    ),
    (
        "gel-spice-tradition-500ml",
        "Gel Spice Tradition",
        "produits-spirituels-intense",
        2000,
        "500 ml.",
        True,
        False,
    ),
    ("savon-spice-corse", "Savon Spice Corsé", "produits-spirituels-intense", 2000, None, False, False),
    ("savon-spice-nila-new", "Savon Spice Nila New", "produits-spirituels-intense", 2000, None, False, False),
    ("nila-spice-scrub", "Nila Spice Scrub", "produits-spirituels-intense", 2000, None, False, False),
    ("poussiere-solaire", "Poussière Solaire", "produits-spirituels-intense", 2000, None, False, False),
    ("the-spice-200g", "The Spice", "produits-spirituels-intense", 5000, "200 g.", False, False),
    ("spice-salt-550g", "Spice Salt", "produits-spirituels-intense", 5000, "550 g.", False, False),
    ("savon-mystere-desir", "Savon Mystère Désir", "produits-spirituels-intense", 2000, None, False, False),
    ("savon-mystere-addict", "Savon Mystère Addict", "produits-spirituels-intense", 2000, None, False, False),
    (
        "rituel-mystere-350g",
        "Rituel Mystère",
        "produits-spirituels-intense",
        5000,
        "350 g.",
        True,
        False,
    ),
    ("creme-venus", "Crème Venus", "produits-spirituels-intense", 1500, None, False, False),
    ("nectar", "Nectar", "produits-spirituels-intense", 2000, None, False, False),
    ("gommage-venus-sugar", "Gommage Venus Sugar", "produits-spirituels-intense", 3000, None, False, False),
    (
        "earth-mask-300g",
        "Earth Mask",
        "produits-spirituels-intense",
        2000,
        "300 g.",
        False,
        False,
    ),
    (
        "pack-acces-groupe-suivi-12h",
        "Accès au groupe et suivi (12h)",
        "packs",
        None,
        "Composant du Pack Suivi Spice. Non vendu au détail.",
        False,
        True,
    ),
    (
        "pack-duo-bandjle",
        "Duo Bandjle",
        "packs",
        None,
        "Composant du Pack Suivi Spice. Non vendu au détail.",
        False,
        True,
    ),
    (
        "pack-sel-verite",
        "Le Sel Vérité",
        "packs",
        None,
        "Composant du Pack Suivi Spice. Non vendu au détail.",
        False,
        True,
    ),
    (
        "pack-poudre-solaire",
        "Poudre solaire",
        "packs",
        None,
        "Composant du Pack Suivi Spice. Non vendu au détail. Distinct de Poussière Solaire.",
        False,
        True,
    ),
]

PACK_SLUG = "pack-suivi-spice"
PACK_ITEMS = [
    "pack-acces-groupe-suivi-12h",
    "pack-duo-bandjle",
    "pack-sel-verite",
    "pack-poudre-solaire",
]
CAMEROUN_QTY = 10


def sync() -> None:
    db = SessionLocal()
    try:
        cameroun = db.scalar(select(CommercialZone).where(CommercialZone.slug == "cameroun"))
        if cameroun is None:
            raise RuntimeError("Zone Cameroun absente. Lancer d’abord le seed de base.")

        cats: dict[str, Category] = {}
        legacy_sacs = db.scalar(select(Category).where(Category.slug == "sacs-a-main"))
        existing_sacs = db.scalar(select(Category).where(Category.slug == "sacs-accessoires"))
        if legacy_sacs is not None and existing_sacs is None:
            legacy_sacs.slug = "sacs-accessoires"
            db.flush()

        for slug, name, order, visible in CATEGORIES:
            row = db.scalar(select(Category).where(Category.slug == slug))
            if row is None:
                row = Category(slug=slug, name=name, sort_order=order, is_visible=visible)
                db.add(row)
                db.flush()
            else:
                row.name = name
                row.sort_order = order
                row.is_visible = visible
            cats[slug] = row

        intense = cats["produits-spirituels-intense"]
        spirituelle = cats["cosmetique-spirituelle"]
        intense.parent_id = spirituelle.id
        spirituelle.parent_id = None

        products: dict[str, Product] = {}
        for slug, name, cat_slug, xaf, description, featured, pack_only in PRODUCTS:
            row = db.scalar(select(Product).where(Product.slug == slug))
            if row is None:
                row = Product(
                    slug=slug,
                    sku=slug[:64],
                    name=name,
                    description=description,
                    category_id=cats[cat_slug].id,
                    is_featured=featured,
                    is_new=False,
                    is_active=not pack_only,
                    is_archived=False,
                )
                db.add(row)
                db.flush()
            else:
                row.name = name
                row.description = description
                row.category_id = cats[cat_slug].id
                row.is_featured = featured
                row.is_new = False
                row.is_active = not pack_only
                row.is_archived = False
            products[slug] = row

            price = db.scalar(
                select(ProductZonePrice).where(
                    ProductZonePrice.product_id == row.id,
                    ProductZonePrice.zone_id == cameroun.id,
                )
            )
            if pack_only:
                if price is not None:
                    price.is_available = False
            else:
                assert xaf is not None
                if price is None:
                    price = ProductZonePrice(
                        product_id=row.id,
                        zone_id=cameroun.id,
                        price_amount=xaf,
                        promo_price_amount=None,
                        promo_is_active=False,
                        is_available=True,
                    )
                    db.add(price)
                else:
                    price.price_amount = xaf
                    price.promo_price_amount = None
                    price.promo_is_active = False
                    price.is_available = True

            stock = db.scalar(
                select(InventoryPosition).where(
                    InventoryPosition.product_id == row.id,
                    InventoryPosition.zone_id == cameroun.id,
                )
            )
            if stock is None:
                db.add(
                    InventoryPosition(
                        product_id=row.id,
                        zone_id=cameroun.id,
                        qty=CAMEROUN_QTY,
                    )
                )
            elif stock.qty == 0:
                stock.qty = CAMEROUN_QTY

        pack = db.scalar(select(Bundle).where(Bundle.slug == PACK_SLUG))
        if pack is None:
            pack = Bundle(
                slug=PACK_SLUG,
                name="Pack Suivi Spice",
                description=(
                    "Accès au groupe et suivi (12h). Duo Bandjle. Le Sel Vérité. Poudre solaire."
                ),
                is_active=True,
                is_archived=False,
            )
            db.add(pack)
            db.flush()
        else:
            pack.name = "Pack Suivi Spice"
            pack.description = (
                "Accès au groupe et suivi (12h). Duo Bandjle. Le Sel Vérité. Poudre solaire."
            )
            pack.is_active = True
            pack.is_archived = False

        existing_items = {item.product_id: item for item in pack.items}
        for slug in PACK_ITEMS:
            product = products[slug]
            if product.id not in existing_items:
                db.add(BundleItem(bundle_id=pack.id, product_id=product.id, quantity=1))

        pack_price = db.scalar(
            select(BundleZonePrice).where(
                BundleZonePrice.bundle_id == pack.id,
                BundleZonePrice.zone_id == cameroun.id,
            )
        )
        if pack_price is None:
            db.add(
                BundleZonePrice(
                    bundle_id=pack.id,
                    zone_id=cameroun.id,
                    price_amount=37700,
                    promo_price_amount=None,
                    promo_is_active=False,
                    is_available=True,
                )
            )
        else:
            pack_price.price_amount = 37700
            pack_price.promo_price_amount = None
            pack_price.promo_is_active = False
            pack_price.is_available = True

        db.commit()
        print(
            "Catalogue OK — "
            f"{sum(1 for item in PRODUCTS if not item[6])} produits détail, "
            "1 pack Suivi Spice 37700 XAF, "
            "Olive Noire non créée (conflit de prix)."
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    sync()
