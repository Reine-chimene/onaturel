import { formatMoney, promoPercent, type CurrencyCode } from "@/lib/money";
import type { StockStatus } from "@/lib/status";
import { PromotionBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

export type ProductCardData = {
  name: string;
  category: string;
  imageAlt?: string;
  currency: CurrencyCode;
  price: number;
  promoPrice?: number;
  isNew?: boolean;
  stock: StockStatus;
};

export function ProductPrice({
  currency,
  price,
  promoPrice,
}: {
  currency: CurrencyCode;
  price: number;
  promoPrice?: number;
}) {
  const onPromo = promoPrice != null && promoPrice < price;
  return (
    <div className="on-product__prices">
      {onPromo ? (
        <>
          <span className="on-price">{formatMoney(promoPrice, currency)}</span>
          <span className="on-price on-price--struck">{formatMoney(price, currency)}</span>
        </>
      ) : (
        <span className="on-price">{formatMoney(price, currency)}</span>
      )}
    </div>
  );
}

export function ProductCard({
  name,
  category,
  currency,
  price,
  promoPrice,
  isNew,
  stock,
}: ProductCardData) {
  const out = stock === "OUT_OF_STOCK";
  const onPromo = promoPrice != null && promoPrice < price;
  return (
    <article className={`on-product ${out ? "is-out" : ""}`}>
      <div className="on-product__media" aria-hidden="true">
        <div className="on-image-frame" style={{ minHeight: "100%" }}>
          Photo produit
        </div>
        <div className="on-product__flags">
          {isNew ? <StatusBadge kind="tag" value="NEW" /> : null}
          {onPromo ? <PromotionBadge percent={promoPercent(price, promoPrice)} /> : null}
          {out ? <StatusBadge kind="stock" value="OUT_OF_STOCK" /> : null}
        </div>
      </div>
      <div className="on-product__meta">
        <p className="on-product__cat">{category}</p>
        <h3 className="on-h3">{name}</h3>
        <ProductPrice currency={currency} price={price} promoPrice={promoPrice} />
        {stock === "LOW_STOCK" ? <StatusBadge kind="stock" value="LOW_STOCK" /> : null}
      </div>
      <div className="on-product__cta">
        <Button disabled={out}>{out ? "Indisponible" : "Commander"}</Button>
      </div>
    </article>
  );
}

export function CategoryCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <a href="#boutique" className="on-product" style={{ textDecoration: "none" }}>
      <div className="on-image-frame">Univers</div>
      <p className="on-product__cat">{subtitle}</p>
      <h3 className="on-h3">{title}</h3>
    </a>
  );
}
