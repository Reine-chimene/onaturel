"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorNote } from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/admin/api";
import type { OrderAdmin, ZoneOut } from "@/lib/admin/types";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { FulfillmentMode, OrderStatus, PaymentStatus } from "@/lib/status";
import { SearchInput } from "@/components/ui/SearchInput";
import { downloadCsv } from "@/lib/export/csv";

const STATUS_FILTERS = [
  { value: "", label: "Toutes" },
  { value: "NEW", label: "Nouvelles" },
  { value: "CONFIRMED", label: "Confirmées" },
  { value: "CANCELLED", label: "Annulées" },
];

const PRODUCT_PAY = [
  { value: "", label: "Paiement produit" },
  { value: "PENDING", label: "Produits en attente" },
  { value: "PAID", label: "Produits payés" },
];

const FEE_PAY = [
  { value: "", label: "Paiement livraison" },
  { value: "DUE_ON_FULFILLMENT", label: "Dû à la livraison" },
  { value: "PAID", label: "Livraison payée" },
];

const MODE_FILTERS = [
  { value: "", label: "Tous modes" },
  { value: "DELIVERY", label: "Livraison" },
  { value: "SHIPPING", label: "Expédition" },
  { value: "PICKUP", label: "Retrait" },
];

function formatOrderWhen(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function CommandesPage() {
  const [orders, setOrders] = useState<OrderAdmin[] | null>(null);
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [mode, setMode] = useState("");
  const [productPay, setProductPay] = useState("");
  const [feePay, setFeePay] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    adminJson<ZoneOut[]>("/api/v1/zones/all").then(setZones).catch(() => setZones([]));
  }, []);

  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (zoneId) params.set("zone_id", zoneId);
    if (mode) params.set("fulfillment_mode", mode);
    if (productPay) params.set("products_payment", productPay);
    if (feePay) params.set("fulfillment_payment", feePay);
    if (q.trim()) params.set("q", q.trim());
    const query = params.toString();
    return query ? `/api/v1/orders?${query}` : "/api/v1/orders";
  }, [status, zoneId, mode, productPay, feePay, q]);

  useEffect(() => {
    let cancelled = false;
    adminJson<OrderAdmin[]>(path)
      .then((rows) => {
        if (!cancelled) {
          setOrders(rows);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setOrders(null);
          setError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Commandes</p>
          <h1 className="on-h1">Suivi des commandes</h1>
          <p className="on-small">Recherchez par téléphone pour voir l’historique d’une cliente.</p>
        </div>
        {orders && orders.length > 0 ? (
          <button
            type="button"
            className="on-btn on-btn--secondary"
            onClick={() =>
              downloadCsv(
                "commandes-onaturelle.csv",
                ["Numero", "Date", "Cliente", "Telephone", "Zone", "Montant", "Statut"],
                orders.map((row) => [
                  row.number,
                  new Date(row.created_at).toLocaleString("fr-FR"),
                  row.customer_name,
                  row.customer_phone,
                  row.zone_name ?? "",
                  String(row.products_amount),
                  row.status,
                ]),
              )
            }
          >
            Exporter CSV
          </button>
        ) : null}
      </header>
      <div className="adm-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="N°, nom, téléphone" />
        <div className="adm-filters">
          {STATUS_FILTERS.map((item) => (
            <button key={item.value} type="button" className="adm-chip" aria-pressed={status === item.value} onClick={() => setStatus(item.value)}>
              {item.label}
            </button>
          ))}
          {zones.map((zone) => (
            <button key={zone.id} type="button" className="adm-chip" aria-pressed={zoneId === zone.id} onClick={() => setZoneId(zoneId === zone.id ? "" : zone.id)}>
              {zone.name}
            </button>
          ))}
          {MODE_FILTERS.map((item) => (
            <button key={item.value} type="button" className="adm-chip" aria-pressed={mode === item.value} onClick={() => setMode(item.value)}>
              {item.label}
            </button>
          ))}
          {PRODUCT_PAY.map((item) => (
            <button key={item.value} type="button" className="adm-chip" aria-pressed={productPay === item.value} onClick={() => setProductPay(item.value)}>
              {item.label}
            </button>
          ))}
          {FEE_PAY.map((item) => (
            <button key={item.value} type="button" className="adm-chip" aria-pressed={feePay === item.value} onClick={() => setFeePay(item.value)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <ErrorNote message={error} />
      {q.replace(/\D/g, "").length >= 6 && orders ? (
        <p className="on-small cms-saved">
          Historique client « {q.trim()} » : {orders.length} commande{orders.length > 1 ? "s" : ""}
        </p>
      ) : null}
      {orders && orders.length === 0 ? <EmptyState title="Aucune commande" text="Aucune donnée pour le moment" /> : null}
      {orders && orders.length > 0 ? (
        <>
          <div className="on-table-wrap adm-orders-desktop">
            <table className="on-table adm-orders">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Cliente</th>
                  <th>Zone</th>
                  <th>Montant</th>
                  <th>Paiement</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/dashboard/commandes/${row.id}`}>{row.number}</Link>
                      <span className="adm-orders__sub">
                        <StatusBadge kind="fulfillment" value={row.fulfillment_mode as FulfillmentMode} />
                      </span>
                    </td>
                    <td>
                      <span className="adm-orders__name">{row.customer_name}</span>
                      <span className="adm-orders__sub">{row.customer_phone}</span>
                    </td>
                    <td>{row.zone_name}</td>
                    <td>
                      <span className="adm-orders__name">{formatMoney(row.products_amount, row.currency_code)}</span>
                      <span className="adm-orders__sub">Frais {formatMoney(row.fulfillment_fee_amount, row.currency_code)}</span>
                    </td>
                    <td>
                      <div className="adm-orders__pay">
                        <span>
                          <span className="adm-orders__pay-k">Produits</span>
                          <StatusBadge kind="payment" value={row.products_payment_status as PaymentStatus} />
                        </span>
                        <span>
                          <span className="adm-orders__pay-k">Livraison</span>
                          <StatusBadge kind="payment" value={row.fulfillment_payment_status as PaymentStatus} />
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge kind="order" value={row.status as OrderStatus} />
                    </td>
                    <td>
                      <time dateTime={row.created_at}>{formatOrderWhen(row.created_at)}</time>
                    </td>
                    <td>
                      <Link className="adm-orders__open" href={`/dashboard/commandes/${row.id}`}>
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="adm-cards adm-orders-cards">
            {orders.map((row) => (
              <article className="adm-card" key={row.id}>
                <div className="adm-card__top">
                  <Link href={`/dashboard/commandes/${row.id}`}>{row.number}</Link>
                  <StatusBadge kind="order" value={row.status as OrderStatus} />
                </div>
                <p className="adm-orders__name">{row.customer_name}</p>
                <p className="on-small">{row.customer_phone}</p>
                <p className="on-small">
                  {row.zone_name} · <StatusBadge kind="fulfillment" value={row.fulfillment_mode as FulfillmentMode} />
                </p>
                <p className="on-small">{formatMoney(row.products_amount, row.currency_code)}</p>
                <p className="on-small">Frais {formatMoney(row.fulfillment_fee_amount, row.currency_code)}</p>
                <div className="adm-orders__pay">
                  <span>
                    <span className="adm-orders__pay-k">Produits</span>
                    <StatusBadge kind="payment" value={row.products_payment_status as PaymentStatus} />
                  </span>
                  <span>
                    <span className="adm-orders__pay-k">Livraison</span>
                    <StatusBadge kind="payment" value={row.fulfillment_payment_status as PaymentStatus} />
                  </span>
                </div>
                <p className="on-small">{formatOrderWhen(row.created_at)}</p>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
