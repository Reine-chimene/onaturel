"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartDrawer } from "@/components/commerce/CartDrawer";
import { ZoneSwitchDialog } from "@/components/commerce/ZoneSwitchDialog";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";
import { fetchOrder, type PublicOrder } from "@/lib/checkout";
import { formatMoney, type CurrencyCode } from "@/lib/money";
import { orderWhatsAppMessage } from "@/lib/orderWhatsApp";
import { usePublicSession } from "@/lib/usePublicSession";
import { useSiteContent, whatsappHref } from "@/lib/useSiteContent";
import "@/styles/home.css";
import "@/styles/checkout.css";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "not-found" }
  | { status: "ready"; order: PublicOrder };

export function ConfirmationPage({ number }: { number: string }) {
  const session = usePublicSession();
  const { content } = useSiteContent();
  const { zone, onZone, pendingZone, confirmZone, cancelZone, cartOpen, setCartOpen, lines, onQuantity, remove } = session;
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchOrder(number)
      .then((result) => {
        if (cancelled) return;
        if (result === "not-found") setState({ status: "not-found" });
        else setState({ status: "ready", order: result });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "La confirmation n’a pas pu être affichée.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [number]);

  const order = state.status === "ready" ? state.order : null;
  const currency = (order?.currency_code ?? "XAF") as CurrencyCode;
  const waBase = whatsappHref(content.contact.whatsapp_e164);
  const wa = order ? `${waBase}?text=${encodeURIComponent(orderWhatsAppMessage(order))}` : waBase;

  return (
    <div className="chk">
      <SiteHeader zone={zone} onZone={onZone} onCart={() => setCartOpen(true)} forceSolid />
      <div className="chk-shell">
        {state.status === "loading" ? <p className="chk-lead">Nous préparons votre confirmation.</p> : null}
        {state.status === "error" ? (
          <>
            <h1>Confirmation indisponible</h1>
            <p className="chk-error">{state.message}</p>
          </>
        ) : null}
        {state.status === "not-found" ? (
          <>
            <h1>Commande introuvable</h1>
            <Link className="on-btn on-btn--primary" href="/boutique">
              Retour à la boutique
            </Link>
          </>
        ) : null}
        {order ? (
          <>
            <p className="on-label">Commande {order.number}</p>
            <h1>Merci pour votre commande</h1>
            <p className="chk-lead">
              {order.customer_name}, votre demande a bien été enregistrée.
            </p>
            <div className="chk-layout">
              <div>
                <p className="on-label">Produits</p>
                <ul className="chk-lines">
                  {order.items.map((item, index) => (
                    <li key={`${item.name}-${index}`} className="chk-line" style={{ gridTemplateColumns: "1fr" }}>
                      <div>
                        <p className="chk-line__name">{item.name}</p>
                        <p className="on-small">
                          {item.quantity} × {formatMoney(item.unit_price, currency)}
                        </p>
                        <p className="chk-line__sub">{formatMoney(item.line_total, currency)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p>
                  Réception : {order.fulfillment_label}
                  {order.neighborhood ? ` · ${order.neighborhood}` : ""}
                  {order.city ? ` · ${order.city}` : ""}
                </p>
              </div>
              <aside className="chk-summary">
                <dl>
                  <div>
                    <dt>Produits</dt>
                    <dd>{formatMoney(order.products_amount, currency)}</dd>
                  </div>
                  <div>
                    <dt>Frais de réception</dt>
                    <dd>
                      {order.fulfillment_payment_status === "NOT_APPLICABLE"
                        ? "Aucun"
                        : order.fee_known
                          ? formatMoney(order.fulfillment_fee_amount, currency)
                          : "À confirmer"}
                    </dd>
                  </div>
                  <div>
                    <dt>Total des produits</dt>
                    <dd className="on-price">{formatMoney(order.products_amount, currency)}</dd>
                  </div>
                  <div>
                    <dt>Total à payer maintenant</dt>
                    <dd className="on-price">{formatMoney(order.pay_now_amount, currency)}</dd>
                  </div>
                </dl>
                <p className="chk-note">
                  {order.fulfillment_mode === "PICKUP"
                    ? "Les produits sont réglés à l’avance."
                    : order.fulfillment_mode === "SHIPPING"
                      ? "Les produits sont payés à l’avance. Les frais d’expédition sont réglés à part, lorsqu’ils sont connus."
                      : "Les produits sont payés à l’avance. Les frais de livraison sont réglés à la livraison."}
                </p>
                <div className="chk-cta">
                  <a className="on-btn on-btn--primary" href={wa}>
                    Envoyer à O’Naturelle
                  </a>
                </div>
                <p className="on-small" style={{ marginTop: "0.85rem" }}>
                  {content.contact.whatsapp_display}
                </p>
              </aside>
            </div>
          </>
        ) : null}
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
