"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartDrawer } from "@/components/commerce/CartDrawer";
import { QuantitySelector } from "@/components/commerce/ProductTools";
import { ZoneSwitchDialog } from "@/components/commerce/ZoneSwitchDialog";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";
import { quoteCart, toQuoteItems, type CartQuote } from "@/lib/checkout";
import { formatMoney, type CurrencyCode } from "@/lib/money";
import { usePublicSession } from "@/lib/usePublicSession";
import "@/styles/home.css";
import "@/styles/checkout.css";

export function CartPage() {
  const session = usePublicSession();
  const { zone, onZone, hydrated, pendingZone, confirmZone, cancelZone, cartOpen, setCartOpen, lines, onQuantity, remove } =
    session;
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (lines.length === 0) {
      setQuote(null);
      setError(null);
      return;
    }
    let cancelled = false;
    quoteCart(zone, toQuoteItems(lines))
      .then((result) => {
        if (!cancelled) {
          setQuote(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Le panier n’a pas pu être vérifié.");
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, zone, lines]);

  const currency = (quote?.currency_code ?? lines[0]?.currency ?? "XAF") as CurrencyCode;
  const display = quote?.lines.length ? quote.lines : null;
  const productsAmount = quote?.products_amount ?? lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const blocked = Boolean(quote && !quote.can_submit);

  return (
    <div className="chk">
      <SiteHeader zone={zone} onZone={onZone} onCart={() => setCartOpen(true)} forceSolid />
      <div className="chk-shell">
        <p className="on-label">Commande</p>
        <h1>Votre panier</h1>
        <p className="chk-lead">Prix et disponibilités de la zone {zone === "europe" ? "Europe · EUR" : "Cameroun · XAF"}.</p>

        {lines.length === 0 ? (
          <div className="chk-empty">
            <p>Votre panier est vide.</p>
            <Link className="on-btn on-btn--primary" href="/boutique">
              Retour à la boutique
            </Link>
          </div>
        ) : (
          <div className="chk-layout">
            <ul className="chk-lines">
              {(display ?? lines.map((line) => ({
                kind: line.kind,
                id: line.id,
                name: line.name,
                image_url: line.image_url ?? null,
                quantity: line.quantity,
                max_quantity: line.max,
                unit_price: line.unitPrice,
                list_price: line.unitPrice,
                promo_active: false,
                line_total: line.unitPrice * line.quantity,
                ok: true,
                issue: null,
                slug: line.slug,
              }))).map((line) => (
                <li key={`${line.kind}-${line.id}`} className="chk-line">
                  <span className="chk-line__visual">
                    {line.image_url ? <img src={line.image_url} alt="" /> : <span>{line.kind === "pack" ? "Pack" : "Soin"}</span>}
                  </span>
                  <div>
                    <p className="chk-line__name">{line.name}</p>
                    {line.promo_active && line.list_price > line.unit_price ? (
                      <p className="on-small">
                        <span className="on-price on-price--struck">{formatMoney(line.list_price, currency)}</span>{" "}
                        {formatMoney(line.unit_price, currency)}
                      </p>
                    ) : (
                      <p className="on-small">{formatMoney(line.unit_price, currency)}</p>
                    )}
                    <QuantitySelector
                      value={line.quantity}
                      max={Math.max(line.max_quantity, 1)}
                      min={0}
                      disabled={line.max_quantity <= 0}
                      onChange={(quantity) => onQuantity(line.id, quantity)}
                    />
                    <p className="chk-line__sub">{formatMoney(line.line_total || line.unit_price * line.quantity, currency)}</p>
                    {line.issue ? <p className="chk-line__issue">{line.issue}</p> : null}
                    <button type="button" className="chk-line__remove" onClick={() => remove(line.id)}>
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="chk-summary">
              <p className="on-label">Récapitulatif</p>
              <dl>
                <div>
                  <dt>Produits</dt>
                  <dd>{formatMoney(productsAmount, currency)}</dd>
                </div>
                <div>
                  <dt>Frais de réception</dt>
                  <dd>À la commande</dd>
                </div>
                <div>
                  <dt>Total des produits</dt>
                  <dd className="on-price">{formatMoney(productsAmount, currency)}</dd>
                </div>
              </dl>
              {error ? <p className="chk-error">{error}</p> : null}
              {blocked ? (
                <p className="chk-error">Merci de corriger les quantités avant de continuer.</p>
              ) : null}
              <div className="chk-cta">
                <Link
                  className={`on-btn on-btn--primary${blocked || lines.length === 0 ? " is-disabled" : ""}`}
                  href="/commande"
                  aria-disabled={blocked || lines.length === 0}
                  onClick={(event) => {
                    if (blocked || lines.length === 0) event.preventDefault();
                  }}
                >
                  Continuer la commande
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
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
