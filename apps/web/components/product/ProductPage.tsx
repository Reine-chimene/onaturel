"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CartDrawer } from "@/components/commerce/CartDrawer";
import { QuantitySelector } from "@/components/commerce/ProductTools";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";
import { ZoneSwitchDialog } from "@/components/commerce/ZoneSwitchDialog";
import { fetchPublicProduct, type PublicProduct, type PublicProductDetail } from "@/lib/catalog";
import { formatMoney, promoPercent, type CurrencyCode } from "@/lib/money";
import { WHATSAPP_DISPLAY, WHATSAPP_HREF } from "@/lib/site";
import { usePublicSession } from "@/lib/usePublicSession";
import "@/styles/home.css";
import "@/styles/product.css";

type PageState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "not-found" }
  | { status: "ready"; product: PublicProductDetail };

function sellingPrice(product: PublicProductDetail): number | null {
  if (product.price == null) return null;
  if (product.promo_active && product.promo_price != null) return product.promo_price;
  return product.price;
}

function Gallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const current = images[index];

  useEffect(() => {
    setIndex(0);
  }, [images]);

  const go = useCallback(
    (next: number) => {
      if (images.length === 0) return;
      setIndex((next + images.length) % images.length);
    },
    [images.length],
  );

  return (
    <div className="pdp-gallery">
      <div
        className="pdp-gallery__stage"
        onTouchStart={(event) => {
          startX.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (startX.current == null || images.length < 2) return;
          const dx = (event.changedTouches[0]?.clientX ?? startX.current) - startX.current;
          if (dx > 40) go(index - 1);
          if (dx < -40) go(index + 1);
          startX.current = null;
        }}
      >
        {current ? (
          <img src={current} alt={name} className="pdp-gallery__img" fetchPriority="high" />
        ) : (
          <span>Photographie à venir</span>
        )}
      </div>
      {images.length > 1 ? (
        <div className="pdp-gallery__thumbs" role="list">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              role="listitem"
              aria-label={`Photo ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            >
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PriceBlock({ product }: { product: PublicProductDetail }) {
  if (product.price == null || product.price <= 0) return null;
  const currency = product.currency_code as CurrencyCode;
  if (product.promo_active && product.promo_price != null) {
    const percent = promoPercent(product.price, product.promo_price);
    return (
      <p className="pdp-price">
        <span className="on-price">{formatMoney(product.promo_price, currency)}</span>
        <span className="on-price on-price--struck">{formatMoney(product.price, currency)}</span>
        {percent > 0 ? <span className="pdp-promo">−{percent} %</span> : null}
      </p>
    );
  }
  return (
    <p className="pdp-price">
      <span className="on-price">{formatMoney(product.price, currency)}</span>
    </p>
  );
}

function Related({ items }: { items: PublicProduct[] }) {
  if (items.length === 0) return null;
  return (
    <section className="pdp-related" aria-labelledby="pdp-related-title">
      <p className="on-label">Continuer</p>
      <h2 id="pdp-related-title">Vous pourriez aussi aimer</h2>
      <ul>
        {items.map((item) => {
          const currency = item.currency_code as CurrencyCode;
          const price =
            item.promo_active && item.promo_price != null ? item.promo_price : item.price;
          return (
            <li key={item.id}>
              <Link href={`/boutique/${item.slug}`}>
                <span className="pdp-related__visual">
                  {item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : <span>Photo à venir</span>}
                </span>
                <span className="pdp-related__meta">
                  {item.category_name ? <span className="on-label">{item.category_name}</span> : null}
                  <strong>{item.name}</strong>
                  <span className="on-price">{formatMoney(price, currency)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ProductPage({ slug }: { slug: string }) {
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
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    setState({ status: "loading" });
    fetchPublicProduct(slug, zone)
      .then((result) => {
        if (cancelled) return;
        if (result === "not-found") setState({ status: "not-found" });
        else setState({ status: "ready", product: result });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, zone, retry, hydrated]);

  useEffect(() => {
    if (state.status !== "ready") return;
    const max = state.product.qty;
    setQuantity(max > 0 ? 1 : 0);
  }, [state]);

  const product = state.status === "ready" ? state.product : null;
  const unit = product ? sellingPrice(product) : null;
  const canBuy = Boolean(product?.offered && product.available && product.qty > 0 && unit != null);
  const questionHref = product
    ? `${WHATSAPP_HREF}?text=${encodeURIComponent(`Bonjour, j’ai une question sur ${product.name}.`)}`
    : WHATSAPP_HREF;

  function addToCart() {
    if (!product || !canBuy || unit == null) return;
    add({
      id: product.id,
      kind: "product",
      slug: product.slug,
      name: product.name,
      unitPrice: unit,
      currency: product.currency_code,
      max: product.qty,
      quantity,
      image_url: product.images[0] ?? null,
    });
    setCartOpen(true);
  }

  return (
    <div className="pdp">
      <SiteHeader
        zone={zone}
        onZone={onZone}
        onCart={() => setCartOpen(true)}
        forceSolid
      />

      {state.status === "loading" ? (
        <div className="pdp-shell">
          <p className="pdp-crumb">
            <Link href="/boutique">Boutique</Link>
          </p>
          <div className="pdp-layout" aria-busy="true">
            <div className="pdp-skeleton pdp-skeleton--media" />
            <div className="pdp-skeleton pdp-skeleton--copy" />
          </div>
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="pdp-shell pdp-state">
          <p className="pdp-crumb">
            <Link href="/boutique">Boutique</Link>
          </p>
          <h1>La fiche est momentanément indisponible.</h1>
          <button type="button" className="on-btn on-btn--primary" onClick={() => setRetry((n) => n + 1)}>
            Réessayer
          </button>
        </div>
      ) : null}

      {state.status === "not-found" ? (
        <div className="pdp-shell pdp-state">
          <p className="pdp-crumb">
            <Link href="/boutique">Boutique</Link>
          </p>
          <h1>Ce produit n’est pas dans la boutique.</h1>
          <Link className="on-btn on-btn--primary" href="/boutique">
            Retour à la boutique
          </Link>
        </div>
      ) : null}

      {product ? (
        <div className="pdp-shell">
          <nav className="pdp-crumb" aria-label="Fil d’Ariane">
            <Link href="/boutique">Boutique</Link>
            {product.category_name && product.category_slug ? (
              <>
                <span aria-hidden="true">→</span>
                <Link href={`/boutique?categorie=${product.category_slug}`}>{product.category_name}</Link>
              </>
            ) : null}
            <span aria-hidden="true">→</span>
            <span>{product.name}</span>
          </nav>

          <div className="pdp-layout">
            <Gallery images={product.images} name={product.name} />

            <div className="pdp-info">
              {product.category_name ? <p className="on-label">{product.category_name}</p> : null}
              <h1>{product.name}</h1>
              {product.description ? <p className="pdp-desc">{product.description}</p> : null}

              <PriceBlock product={product} />

              {product.offered ? (
                product.available ? (
                  product.stock_status === "LOW_STOCK" ? (
                    <p className="pdp-stock">Stock limité</p>
                  ) : null
                ) : (
                  <p className="pdp-stock pdp-stock--out">Rupture de stock</p>
                )
              ) : (
                <p className="pdp-stock pdp-stock--out">Indisponible dans cette zone</p>
              )}

              <div className="pdp-buy">
                {canBuy ? (
                  <QuantitySelector value={quantity} max={product.qty} onChange={setQuantity} />
                ) : null}
                <button
                  type="button"
                  className="on-btn on-btn--primary"
                  disabled={!canBuy}
                  onClick={addToCart}
                >
                  {!product.offered
                    ? "Indisponible"
                    : product.available
                      ? "Ajouter au panier"
                      : "Rupture de stock"}
                </button>
              </div>

              <p className="pdp-help">
                Une question ?{" "}
                <a href={questionHref}>Écrire à O’Naturelle</a>
                <span> · {WHATSAPP_DISPLAY}</span>
              </p>
            </div>
          </div>

          <Related items={product.related} />
        </div>
      ) : null}

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
