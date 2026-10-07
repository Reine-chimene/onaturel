"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ErrorNote } from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/admin/api";
import type { OrderAdmin } from "@/lib/admin/types";
import { formatMoney, minorToInput, parseMajorToMinor } from "@/lib/money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { FulfillmentMode, OrderStatus, PaymentStatus } from "@/lib/status";

export default function CommandeDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fee, setFee] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    const data = await adminJson<OrderAdmin>(`/api/v1/orders/${params.id}`);
    setOrder(data);
    setFee(minorToInput(data.fulfillment_fee_amount, data.currency_code));
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function act(path: string, body: unknown) {
    setPending(true);
    setError(null);
    try {
      const data = await adminJson<OrderAdmin>(path, { method: path.includes("status") ? "POST" : "PATCH", body: JSON.stringify(body) });
      setOrder(data);
      setFee(minorToInput(data.fulfillment_fee_amount, data.currency_code));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setPending(false);
    }
  }

  if (!order && !error) return <p className="on-small">Chargement…</p>;
  if (!order) return <ErrorNote message={error} />;

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">
            <Link href="/dashboard/commandes">Commandes</Link>
          </p>
          <h1 className="on-h1">{order.number}</h1>
        </div>
        <StatusBadge kind="order" value={order.status as OrderStatus} />
      </header>
      <ErrorNote message={error} />

      <section className="adm-form">
        <h2 className="on-h3">Cliente</h2>
        <p>{order.customer_name}</p>
        <p>{order.customer_phone}</p>
        <p>Zone : {order.zone_name}</p>
        <p>
          Mode de réception : <StatusBadge kind="fulfillment" value={order.fulfillment_mode as FulfillmentMode} />
        </p>
        {order.fulfillment_mode === "DELIVERY" ? <p>Quartier : {order.neighborhood || "—"}</p> : null}
        {order.fulfillment_mode === "SHIPPING" ? <p>Ville : {order.city || "—"}</p> : null}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2 className="on-h3">Produits</h2>
        <div className="on-table-wrap adm-table-desktop">
          <table className="on-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Qté</th>
                <th>Prix</th>
                <th>Sous-total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{formatMoney(item.unit_price, order.currency_code)}</td>
                  <td>{formatMoney(item.line_total, order.currency_code)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="adm-cards adm-cards--hide">
          {(order.items ?? []).map((item) => (
            <article className="adm-card" key={item.id}>
              <p>{item.name}</p>
              <p className="on-small">
                {item.quantity} × {formatMoney(item.unit_price, order.currency_code)} = {formatMoney(item.line_total, order.currency_code)}
              </p>
            </article>
          ))}
        </div>
        <p style={{ marginTop: "1rem" }}>
          Montant produits : <strong>{formatMoney(order.products_amount, order.currency_code)}</strong>
        </p>
        <p>
          Frais de livraison : <strong>{formatMoney(order.fulfillment_fee_amount, order.currency_code)}</strong>
        </p>
        <p>
          Total : <strong>{formatMoney(order.total_due ?? order.products_amount + order.fulfillment_fee_amount, order.currency_code)}</strong>
        </p>
        <p>
          Paiement produits : <StatusBadge kind="payment" value={order.products_payment_status as PaymentStatus} />
        </p>
        <p>
          Paiement livraison : <StatusBadge kind="payment" value={order.fulfillment_payment_status as PaymentStatus} />
        </p>
        <p>
          Statut commande : <StatusBadge kind="order" value={order.status as OrderStatus} />
        </p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2 className="on-h3">Gestion</h2>
        <div className="adm-actions">
          {order.status === "NEW" ? (
            <>
              <button type="button" className="on-btn on-btn--primary" disabled={pending} onClick={() => act(`/api/v1/orders/${order.id}/status`, { status: "CONFIRMED" })}>
                Confirmer
              </button>
              <button type="button" className="on-btn on-btn--danger" disabled={pending} onClick={() => act(`/api/v1/orders/${order.id}/status`, { status: "CANCELLED" })}>
                Annuler
              </button>
            </>
          ) : null}
          {order.status === "CONFIRMED" ? (
            <>
              <button type="button" className="on-btn on-btn--secondary" disabled={pending} onClick={() => act(`/api/v1/orders/${order.id}/status`, { status: "PREPARING" })}>
                Préparer
              </button>
              <button type="button" className="on-btn on-btn--danger" disabled={pending} onClick={() => act(`/api/v1/orders/${order.id}/status`, { status: "CANCELLED" })}>
                Annuler
              </button>
            </>
          ) : null}
          {order.status === "PREPARING" ? (
            <>
              <button type="button" className="on-btn on-btn--secondary" disabled={pending} onClick={() => act(`/api/v1/orders/${order.id}/status`, { status: "READY" })}>
                Marquer prête
              </button>
              <button type="button" className="on-btn on-btn--danger" disabled={pending} onClick={() => act(`/api/v1/orders/${order.id}/status`, { status: "CANCELLED" })}>
                Annuler
              </button>
            </>
          ) : null}
          {order.status === "READY" ? (
            <>
              <button type="button" className="on-btn on-btn--primary" disabled={pending} onClick={() => act(`/api/v1/orders/${order.id}/status`, { status: "DELIVERED" })}>
                Marquer livrée
              </button>
              <button type="button" className="on-btn on-btn--danger" disabled={pending} onClick={() => act(`/api/v1/orders/${order.id}/status`, { status: "CANCELLED" })}>
                Annuler
              </button>
            </>
          ) : null}
        </div>
      </section>

      <section style={{ marginTop: "2rem" }} className="adm-form">
        <h2 className="on-h3">Paiements</h2>
        <p className="on-small">Les produits et la livraison se règlent séparément. Rien n’est marqué payé automatiquement.</p>
        <p className="on-small">
          Produits : {order.products_payment_status === "PAID" ? "PAYÉ" : "EN ATTENTE"}
          {" · "}
          Livraison :{" "}
          {order.fulfillment_payment_status === "PAID"
            ? "PAYÉ"
            : order.fulfillment_payment_status === "NOT_APPLICABLE"
              ? "NON APPLICABLE"
              : "DÛ À LA LIVRAISON"}
        </p>
        <div className="adm-actions">
          <button type="button" className="on-btn on-btn--secondary" disabled={pending} onClick={() => act(`/api/v1/orders/${order.id}/products-payment`, { products_payment_status: order.products_payment_status === "PAID" ? "PENDING" : "PAID" })}>
            Produits : {order.products_payment_status === "PAID" ? "remettre non payé" : "marquer payé"}
          </button>
          <button type="button" className="on-btn on-btn--secondary" disabled={pending} onClick={() => act(`/api/v1/orders/${order.id}/fulfillment-payment`, { fulfillment_payment_status: order.fulfillment_payment_status === "PAID" ? "DUE_ON_FULFILLMENT" : "PAID" })}>
            Livraison : {order.fulfillment_payment_status === "PAID" ? "remettre à la livraison" : "marquer payée"}
          </button>
        </div>
        <label className="on-field">
          <span>Frais de réception ({order.currency_code})</span>
          <input className="on-input" value={fee} onChange={(e) => setFee(e.target.value)} />
        </label>
        <button
          type="button"
          className="on-btn on-btn--secondary"
          disabled={pending}
          onClick={() => {
            const amount = parseMajorToMinor(fee, order.currency_code);
            if (amount == null) {
              setError("Montant de frais invalide.");
              return;
            }
            act(`/api/v1/orders/${order.id}/fulfillment-fee`, { fulfillment_fee_amount: amount });
          }}
        >
          Enregistrer les frais
        </button>
      </section>
    </>
  );
}
