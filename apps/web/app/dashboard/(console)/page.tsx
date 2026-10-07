"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, ErrorNote } from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/admin/api";
import { periodRange } from "@/lib/admin/period";
import type { Overview, ProductAdmin } from "@/lib/admin/types";
import { formatMoney, type CurrencyCode } from "@/lib/money";

export default function DashboardHomePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const range = useMemo(() => periodRange("today"), []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const query = new URLSearchParams();
    if (range.date_from) query.set("date_from", range.date_from);
    if (range.date_to) query.set("date_to", range.date_to);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    Promise.all([
      adminJson<Overview>(`/api/v1/dashboard/overview${suffix}`),
      adminJson<ProductAdmin[]>("/api/v1/products"),
    ])
      .then(([payload, catalog]) => {
        if (cancelled) return;
        setData(payload);
        setProducts(catalog);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setData(null);
          setError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const ruptured = products.filter((product) => product.zones.some((zone) => zone.stock_status === "OUT_OF_STOCK"));
  const low = products.filter((product) => product.zones.some((zone) => zone.stock_status === "LOW_STOCK"));

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Tableau de bord</p>
          <h1 className="on-h1">{data?.greeting ?? "Bonjour, O’Naturelle"}</h1>
          <p className="adm-lede">Vue du jour — ventes, stock et chiffre d’affaires.</p>
        </div>
      </header>

      <ErrorNote message={error} />
      {!data && !error ? <p className="on-small">Chargement…</p> : null}

      {data ? (
        <>
          <section className="adm-kpis" aria-label="Indicateurs du jour">
            <Kpi label="Commandes reçues" value={data.orders.today} hint="aujourd’hui" />
            <Kpi label="Produits vendus" value={data.products_sold} hint="confirmés aujourd’hui" />
            <Kpi label="Stock faible" value={data.low_stock ?? 0} />
            <Kpi label="Ruptures" value={data.out_of_stock} />
          </section>

          <section className="adm-finance" aria-label="Chiffre d’affaires du jour">
            <FinanceBlock title="Cameroun" currency="XAF" rows={data.revenue.filter((r) => r.currency_code === "XAF")} />
            <FinanceBlock title="Europe" currency="EUR" rows={data.revenue.filter((r) => r.currency_code === "EUR")} />
          </section>
          <section style={{ marginTop: "2rem" }}>
            <h2 className="on-h3">Meilleures ventes du jour</h2>
            {(data.top_products ?? []).length === 0 ? (
              <EmptyState title="Aucune vente" text="Aucune vente enregistrée aujourd’hui." />
            ) : (
              <ul className="adm-series">
                {data.top_products.map((item) => (
                  <li key={`${item.zone}-${item.product_id ?? item.name}`}>
                    {item.name} · {item.zone} · {item.quantity} · {formatMoney(item.amount, item.currency_code)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ marginTop: "2rem" }}>
            <h2 className="on-h3">Stock faible</h2>
            {low.length === 0 ? (
              <EmptyState title="Stock OK" text="Aucun produit en stock faible." />
            ) : (
              <ul className="adm-series">
                {low.slice(0, 10).map((product) => (
                  <li key={product.id}>
                    <Link href={`/dashboard/produits/${product.id}`}>{product.name}</Link>
                    {" · "}
                    {product.zones
                      .filter((zone) => zone.stock_status === "LOW_STOCK")
                      .map((zone) => `${zone.zone_name} (${zone.stock})`)
                      .join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ marginTop: "2rem" }}>
            <h2 className="on-h3">Produits en rupture</h2>
            {ruptured.length === 0 ? (
              <EmptyState title="Aucune rupture" text="Tous les produits suivis ont du stock." />
            ) : (
              <ul className="adm-series">
                {ruptured.slice(0, 10).map((product) => (
                  <li key={product.id}>
                    <Link href={`/dashboard/produits/${product.id}`}>{product.name}</Link>
                    {" · "}
                    {product.zones
                      .filter((zone) => zone.stock_status === "OUT_OF_STOCK")
                      .map((zone) => zone.zone_name)
                      .join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="on-small" style={{ marginTop: "2rem" }}>
            Les nouvelles commandes arrivent sur WhatsApp. Consultez l’historique dans{" "}
            <Link href="/dashboard/commandes">Commandes</Link> ou les statistiques dans{" "}
            <Link href="/dashboard/ventes">Ventes</Link>.
          </p>
        </>
      ) : null}
    </>
  );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <article className="adm-kpi">
      <p className="on-small">{label}</p>
      <strong>{new Intl.NumberFormat("fr-FR").format(value)}</strong>
      {hint ? <p className="on-small">{hint}</p> : null}
    </article>
  );
}

function FinanceBlock({
  title,
  currency,
  rows,
}: {
  title: string;
  currency: CurrencyCode;
  rows: Overview["revenue"];
}) {
  const products = rows.reduce((sum, row) => sum + row.products_amount, 0);
  const fees = rows.reduce((sum, row) => sum + row.fulfillment_fees_paid, 0);
  const orders = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <article>
      <p className="on-label">{title}</p>
      <p className="on-small">CA du jour · {currency}</p>
      <strong>{formatMoney(products, currency)}</strong>
      <p className="on-small" style={{ marginTop: "0.5rem" }}>
        Frais payés : {formatMoney(fees, currency)} · {orders} commande(s)
      </p>
    </article>
  );
}
