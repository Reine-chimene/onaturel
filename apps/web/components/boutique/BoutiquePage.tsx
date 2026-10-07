"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CartDrawer } from "@/components/commerce/CartDrawer";
import { ZoneSwitchDialog } from "@/components/commerce/ZoneSwitchDialog";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";
import { fetchShopOrThrow, type PublicPack, type PublicProduct, type PublicShop } from "@/lib/catalog";
import { usePublicSession } from "@/lib/usePublicSession";
import { formatMoney, promoPercent, type CurrencyCode } from "@/lib/money";
import { UNIVERSES, apiCategorySlug, universeOf } from "@/lib/univers";
import { universeLead, universePhoto } from "@/lib/univers-images";
import { useSiteContent, whatsappHref } from "@/lib/useSiteContent";
import "@/styles/home.css";
import "@/styles/boutique.css";

type StockFilter = "all" | "in" | "out";
type PromoFilter = "all" | "promo";
type ShopState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; shop: PublicShop };

function emptyCopy(slug: string) {
  if (slug === "parfums") {
    return {
      title: "Nos parfums arrivent bientôt.",
      lead: "Cette sélection est momentanément vide. Découvrez nos autres univers.",
    };
  }
  if (slug === "sacs-accessoires" || slug === "sacs-a-main") {
    return {
      title: "Notre sélection de sacs & accessoires arrive bientôt.",
      lead: "Cette sélection est momentanément vide. Découvrez nos autres univers.",
    };
  }
  return {
    title: "Cette sélection est momentanément vide.",
    lead: "Découvrez nos autres univers.",
  };
}

function ProductVisual({ product }: { product: PublicProduct }) {
  if (product.image_url) {
    return (
      <img
        src={product.image_url}
        alt=""
        className="btq-visual__img"
        loading="lazy"
      />
    );
  }
  return <span>Photographie à venir</span>;
}

function PriceBlock({ product }: { product: PublicProduct }) {
  if (product.price <= 0) {
    return <p className="btq-price"><span className="on-price">Prix non communiqué</span></p>;
  }
  const currency = product.currency_code as CurrencyCode;
  if (product.promo_active && product.promo_price != null) {
    const percent = promoPercent(product.price, product.promo_price);
    return (
      <p className="btq-price">
        <span className="on-price on-price--struck">{formatMoney(product.price, currency)}</span>
        <span className="on-price">{formatMoney(product.promo_price, currency)}</span>
        {percent > 0 ? <span className="btq-badge btq-badge--promo">−{percent} %</span> : null}
      </p>
    );
  }
  return <p className="btq-price"><span className="on-price">{formatMoney(product.price, currency)}</span></p>;
}

function ProductRow({ product, featured = false }: { product: PublicProduct; featured?: boolean }) {
  return (
    <article className={`btq-item ${featured ? "btq-item--feature" : ""} ${product.available ? "" : "is-oos"}`}>
      <div className="btq-visual">
        <ProductVisual product={product} />
      </div>
      <div className="btq-item__body">
        <p className="on-label">
          {product.category_name ?? "O’Naturelle"}
          {product.is_new ? " · Nouveau" : ""}
        </p>
        <h3>
          <Link href={`/boutique/${product.slug}`}>{product.name}</Link>
        </h3>
        <PriceBlock product={product} />
        {product.available ? null : <p className="btq-oos">Rupture de stock</p>}
        <div className="btq-item__actions">
          {product.available ? (
            <Link className="on-btn on-btn--primary" href={`/boutique/${product.slug}`}>
              Découvrir
            </Link>
          ) : (
            <button type="button" className="on-btn on-btn--primary" disabled>
              Rupture de stock
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function BoutiquePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("categorie") || "all";
  const {
    zone,
    onZone,
    hydrated,
    pendingZone,
    confirmZone,
    cancelZone,
    cartOpen,
    setCartOpen,
    lines,
    add,
    onQuantity,
    remove,
  } = usePublicSession();
  const { content } = useSiteContent();
  const waHref = whatsappHref(content.contact.whatsapp_e164);
  const [state, setState] = useState<ShopState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState<StockFilter>("all");
  const [promo, setPromo] = useState<PromoFilter>("all");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    const q = searchParams.get("q");
    if (q) setQuery(q);
  }, [hydrated, searchParams]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    setState({ status: "loading" });
    const apiCategory = apiCategorySlug(category === "all" ? null : category);
    fetchShopOrThrow(zone, apiCategory)
      .then((shop) => {
        if (!cancelled) setState({ status: "ready", shop });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [zone, retry, hydrated, category]);

  const shop = state.status === "ready" ? state.shop : null;
  const filtered = useMemo(() => {
    if (!shop) return [];
    const needle = query.trim().toLowerCase();
    return shop.products.filter((item) => {
      if (stock === "in" && !item.available) return false;
      if (stock === "out" && item.available) return false;
      if (promo === "promo" && !item.promo_active) return false;
      if (needle) {
        const hay = item.name.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [shop, stock, promo, query]);

  const featured = filtered.find((item) => item.is_featured);
  const rest = featured ? filtered.filter((item) => item.id !== featured.id) : filtered;
  const packs = category === "all" ? (shop?.packs ?? []) : [];
  const zoneLabel = zone === "cameroun" ? "Cameroun · XAF" : "Europe · EUR";
  const selected = shop?.categories.find((item) => item.slug === category);
  const universe = universeOf(category === "all" ? null : category);
  const shopCategories = shop?.categories ?? [];
  const hero = universe
    ? {
        name: universe.name,
        kicker: universe.kicker,
        lead: universeLead(universe, shopCategories),
        photo: universePhoto(universe, shopCategories),
      }
    : {
        name: selected?.name ?? content.boutique.title,
        kicker: content.boutique.kicker,
        lead: `${content.boutique.lead} — zone ${zoneLabel}.`,
        photo: content.boutique.image.url ?? null,
      };
  const empty = category !== "all" ? emptyCopy(category) : null;

  return (
    <div className="home boutique">
      <SiteHeader zone={zone} onZone={onZone} onCart={() => setCartOpen(true)} />

      <section className="btq-hero">
        {hero.photo ? (
          <img className="btq-hero__img" src={hero.photo} alt="" />
        ) : (
          <div className="btq-hero__ph" aria-hidden="true">
            {hero.name}
          </div>
        )}
        <div className="btq-hero__copy home-reveal">
          <p className="on-label" style={{ color: "var(--gold)" }}>
            {universe?.kicker ?? "Maison"}
          </p>
          <h1>{hero.name}</h1>
          <hr className="home-gold-rule" />
          <p>{hero.lead}</p>
        </div>
      </section>

      <div className="btq-toolbar">
        <div className="btq-filters">
          <label>
            <span className="visually-hidden">Univers</span>
            <select
              value={universeOf(category)?.slug ?? (category === "all" || !category ? "all" : category)}
              onChange={(event) => {
                const value = event.target.value;
                router.push(value === "all" ? "/boutique" : `/boutique?categorie=${value}`);
              }}
            >
              <option value="all">Tous les univers</option>
              {(UNIVERSES).map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="btq-search">
            <span className="visually-hidden">Rechercher un produit</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher"
            />
          </label>
          <label>
            <span className="visually-hidden">Disponibilité</span>
            <select value={stock} onChange={(event) => setStock(event.target.value as StockFilter)}>
              <option value="all">Toute disponibilité</option>
              <option value="in">En stock</option>
              <option value="out">Rupture</option>
            </select>
          </label>
          <label>
            <span className="visually-hidden">Promotions</span>
            <select value={promo} onChange={(event) => setPromo(event.target.value as PromoFilter)}>
              <option value="all">Toutes les offres</option>
              <option value="promo">Promotions</option>
            </select>
          </label>
        </div>
      </div>

      <section className="btq-catalog" aria-live="polite">
        {state.status === "loading" ? (
          <div className="btq-state">
            <p className="on-h3">Préparation de la sélection.</p>
          </div>
        ) : null}
        {state.status === "error" ? (
          <div className="btq-state">
            <p className="on-h3">Le catalogue est momentanément indisponible.</p>
            <p>Les prix et stocks de la zone {zoneLabel} seront affichés dès que la connexion sera rétablie.</p>
            <button type="button" className="on-btn on-btn--secondary" onClick={() => setRetry((value) => value + 1)}>
              Réessayer
            </button>
          </div>
        ) : null}
        {state.status === "ready" && shop && category === "all" && shop.products.length === 0 ? (
          <div className="btq-state">
            <p className="on-h3">Cette sélection est momentanément vide.</p>
            <p>
              Les produits publiés depuis le dashboard apparaîtront ici, avec leur prix en{" "}
              {shop.currency_code}.
            </p>
          </div>
        ) : null}
        {state.status === "ready" && shop && category !== "all" && shop.products.length === 0 ? (
          <div className="btq-state">
            <p className="on-h3">{empty?.title}</p>
            <p>{empty?.lead}</p>
          </div>
        ) : null}
        {state.status === "ready" && shop && shop.products.length > 0 && filtered.length === 0 ? (
          <div className="btq-state">
            <p className="on-h3">Aucun résultat.</p>
            <p>Aucun produit de cette zone ne correspond à ces critères.</p>
          </div>
        ) : null}
        {state.status === "ready" && filtered.length > 0 ? (
          <>
            {featured ? <ProductRow product={featured} featured /> : null}
            <div className="btq-list">
              {rest.map((item) => (
                <ProductRow key={item.id} product={item} />
              ))}
            </div>
          </>
        ) : null}
      </section>

      {packs.length > 0 ? (
        <section className="btq-packs">
          <p className="on-label">Coffrets</p>
          <h2 className="on-h1">Nos packs</h2>
          <div className="btq-list">
            {packs.map((item: PublicPack) => {
              const selling =
                item.promo_active && item.promo_price != null ? item.promo_price : item.price;
              return (
              <article key={item.id} className={`btq-item ${item.available ? "" : "is-oos"}`}>
                <div className="btq-visual">
                  <span>Pack</span>
                </div>
                <div className="btq-item__body">
                  <h3>{item.name}</h3>
                  {item.description ? <p className="btq-pack-desc">{item.description}</p> : null}
                  <p className="btq-price">
                    {item.promo_active && item.promo_price != null ? (
                      <>
                        <span className="on-price on-price--struck">{formatMoney(item.price, item.currency_code)}</span>
                        <span className="on-price">{formatMoney(item.promo_price, item.currency_code)}</span>
                      </>
                    ) : (
                      <span className="on-price">{formatMoney(item.price, item.currency_code)}</span>
                    )}
                  </p>
                  {item.available ? null : <p className="btq-oos">Indisponible dans cette zone</p>}
                  {item.available ? (
                    <button
                      type="button"
                      className="on-btn on-btn--primary"
                      onClick={() => {
                        add({
                          id: item.id,
                          kind: "pack",
                          slug: item.slug,
                          name: item.name,
                          unitPrice: selling,
                          currency: item.currency_code,
                          max: item.available_qty,
                          quantity: 1,
                        });
                        setCartOpen(true);
                      }}
                    >
                      Ajouter au panier
                    </button>
                  ) : null}
                </div>
              </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <p className="btq-help">
        Une question sur un soin ?{" "}
        <a href={waHref}>Écrire à O’Naturelle</a>
      </p>

      <SiteFooter />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={lines}
        onQuantity={onQuantity}
        onRemove={remove}
      />
      {pendingZone ? (
        <ZoneSwitchDialog current={zone} next={pendingZone} onConfirm={confirmZone} onCancel={cancelZone} />
      ) : null}
    </div>
  );
}
