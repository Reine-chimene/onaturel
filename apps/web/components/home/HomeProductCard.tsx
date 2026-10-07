"use client";

import Link from "next/link";
import { formatMoney, promoPercent, type CurrencyCode } from "@/lib/money";
import type { PublicPack, PublicProduct } from "@/lib/catalog";

function Visual({ url }: { url: string | null }) {
  if (url) {
    return <img src={url} alt="" className="home-object__img" loading="lazy" />;
  }
  return <span className="home-object__ph">Photographie à venir</span>;
}

export function HomeProductCard({ product }: { product: PublicProduct }) {
  const currency = product.currency_code as CurrencyCode;
  const promo = product.promo_active && product.promo_price != null;
  return (
    <article className={`home-object ${product.available ? "" : "is-oos"}`}>
      <Link className="home-object__visual" href={`/boutique/${product.slug}`}>
        {promo ? <span className="home-object__badge">Promo</span> : null}
        {product.is_new && !promo ? <span className="home-object__badge home-object__badge--new">Nouveau</span> : null}
        <Visual url={product.image_url} />
      </Link>
      <div className="home-object__meta">
        <h3>
          <Link href={`/boutique/${product.slug}`}>{product.name}</Link>
        </h3>
        {promo ? (
          <p className="home-object__price">
            <span className="on-price on-price--struck">{formatMoney(product.price, currency)}</span>
            <span className="on-price">{formatMoney(product.promo_price ?? product.price, currency)}</span>
            {product.promo_price ? (
              <span className="home-object__off">−{promoPercent(product.price, product.promo_price)} %</span>
            ) : null}
          </p>
        ) : (
          <p className="home-object__price">
            <span className="on-price">
              {product.price > 0 ? formatMoney(product.price, currency) : "Prix non communiqué"}
            </span>
          </p>
        )}
        <p className={`home-object__stock ${product.available ? "" : "is-out"}`}>
          {product.available ? "Disponible" : "Rupture de stock"}
        </p>
        <Link className="home-object__cta" href={`/boutique/${product.slug}`}>
          Voir
        </Link>
      </div>
    </article>
  );
}

export function HomePackCard({ pack }: { pack: PublicPack }) {
  const promo = pack.promo_active && pack.promo_price != null;
  return (
    <article className={`home-object ${pack.available ? "" : "is-oos"}`}>
      <Link className="home-object__visual" href="/boutique">
        {pack.image_url ? <img src={pack.image_url} alt="" className="home-object__img" loading="lazy" /> : <span className="home-object__ph">Pack</span>}
      </Link>
      <div className="home-object__meta">
        <h3>
          <Link href="/boutique">{pack.name}</Link>
        </h3>
        {promo ? (
          <p className="home-object__price">
            <span className="on-price on-price--struck">{formatMoney(pack.price, pack.currency_code)}</span>
            <span className="on-price">{formatMoney(pack.promo_price ?? pack.price, pack.currency_code)}</span>
          </p>
        ) : (
          <p className="home-object__price">
            <span className="on-price">
                {pack.price > 0 ? formatMoney(pack.price, pack.currency_code) : "Prix non communiqué"}
            </span>
          </p>
        )}
        <p className={`home-object__stock ${pack.available ? "" : "is-out"}`}>
          {pack.available ? "Disponible" : "Pack indisponible"}
        </p>
        <Link className="home-object__cta" href="/boutique">
          Voir
        </Link>
      </div>
    </article>
  );
}
