"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorNote } from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/admin/api";
import { periodRange, withPeriod, type PeriodKey } from "@/lib/admin/period";
import type { CurrencyCode } from "@/lib/admin/types";
import { formatMoney } from "@/lib/money";
import { downloadCsv } from "@/lib/export/csv";

type RevenueResponse = {
  rows: {
    zone: string;
    currency_code: CurrencyCode;
    channel: string;
    products_amount: number;
    fulfillment_fees_paid: number;
    count: number;
  }[];
  note: string;
};

type SeriesResponse = {
  series: {
    zone: string;
    currency_code: CurrencyCode;
    points: { period: string; products_amount: number; fulfillment_fees_paid: number; orders: number }[];
  }[];
};

type TopResponse = {
  items: { zone: string; currency_code: CurrencyCode; name: string; quantity: number; amount: number }[];
};

type SalesLinesResponse = {
  items: {
    order_number: string;
    created_at: string;
    zone: string;
    currency_code: CurrencyCode;
    name: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }[];
};

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Aujourd’hui" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
  { key: "month", label: "Ce mois" },
  { key: "previous", label: "Mois précédent" },
  { key: "custom", label: "Personnalisé" },
];

export default function VentesPage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [revenue, setRevenue] = useState<RevenueResponse | null>(null);
  const [series, setSeries] = useState<SeriesResponse | null>(null);
  const [top, setTop] = useState<TopResponse | null>(null);
  const [lines, setLines] = useState<SalesLinesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const range = useMemo(() => periodRange(period, from, to), [period, from, to]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminJson<RevenueResponse>(withPeriod("/api/v1/reports/revenue", range)),
      adminJson<SeriesResponse>(withPeriod("/api/v1/reports/series", range, { granularity: "day" })),
      adminJson<TopResponse>(withPeriod("/api/v1/reports/top-products", range)),
      adminJson<SalesLinesResponse>(withPeriod("/api/v1/reports/sales-lines", range)),
    ])
      .then(([rev, ser, tops, saleLines]) => {
        if (cancelled) return;
        setRevenue(rev);
        setSeries(ser);
        setTop(tops);
        setLines(saleLines);
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const xaf = revenue?.rows.filter((r) => r.currency_code === "XAF") ?? [];
  const eur = revenue?.rows.filter((r) => r.currency_code === "EUR") ?? [];

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Rapports</p>
          <h1 className="on-h1">Ventes</h1>
        </div>
        {lines && lines.items.length > 0 ? (
          <button
            type="button"
            className="on-btn on-btn--secondary"
            onClick={() =>
              downloadCsv(
                "ventes-onaturelle.csv",
                ["Date", "Commande", "Produit", "Quantite", "Prix unitaire", "Montant", "Zone", "Devise"],
                lines.items.map((item) => [
                  new Date(item.created_at).toLocaleString("fr-FR"),
                  item.order_number,
                  item.name,
                  String(item.quantity),
                  String(item.unit_price),
                  String(item.amount),
                  item.zone,
                  item.currency_code,
                ]),
              )
            }
          >
            Exporter CSV
          </button>
        ) : null}
      </header>
      <div className="adm-filters" style={{ marginBottom: "1.25rem" }}>
        {PERIODS.map((item) => (
          <button key={item.key} type="button" className="adm-chip" aria-pressed={period === item.key} onClick={() => setPeriod(item.key)}>
            {item.label}
          </button>
        ))}
      </div>
      {period === "custom" ? (
        <div className="adm-toolbar">
          <input className="on-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="on-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      ) : null}
      <ErrorNote message={error} />
      <section className="adm-finance">
        <CaBlock title="Cameroun" currency="XAF" rows={xaf} />
        <CaBlock title="Europe" currency="EUR" rows={eur} />
      </section>
      <p className="on-small">Les commandes NEW et CANCELLED sont exclues. Les frais n’entrent dans le CA que s’ils sont payés.</p>

      <section style={{ marginTop: "2rem" }}>
        <h2 className="on-h3">Évolution — Cameroun</h2>
        <RevenueChart series={series?.series.filter((s) => s.currency_code === "XAF") ?? []} />
      </section>
      <section style={{ marginTop: "2rem" }}>
        <h2 className="on-h3">Évolution — Europe</h2>
        <RevenueChart series={series?.series.filter((s) => s.currency_code === "EUR") ?? []} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2 className="on-h3">Ventes</h2>
        {lines && lines.items.length === 0 ? <EmptyState title="Aucune vente" text="Aucune donnée pour le moment" /> : null}
        {lines && lines.items.length > 0 ? (
          <>
            <div className="on-table-wrap adm-table-desktop">
              <table className="on-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Produit</th>
                    <th>Qté</th>
                    <th>Prix</th>
                    <th>Montant</th>
                    <th>Zone</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.items.map((item, index) => (
                    <tr key={`${item.order_number}-${item.name}-${index}`}>
                      <td>{new Date(item.created_at).toLocaleString("fr-FR")}</td>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{formatMoney(item.unit_price, item.currency_code)}</td>
                      <td>{formatMoney(item.amount, item.currency_code)}</td>
                      <td>{item.zone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="adm-cards adm-cards--hide">
              {lines.items.map((item, index) => (
                <article className="adm-card" key={`${item.order_number}-${item.name}-${index}`}>
                  <p>{item.name}</p>
                  <p className="on-small">
                    {item.quantity} × {formatMoney(item.unit_price, item.currency_code)} = {formatMoney(item.amount, item.currency_code)}
                  </p>
                  <p className="on-small">
                    {item.zone} · {new Date(item.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2 className="on-h3">Produits les plus vendus</h2>
        {top && top.items.length === 0 ? <EmptyState title="Aucune vente" text="Aucune donnée pour le moment" /> : null}
        {top?.items.map((item) => (
          <p key={`${item.zone}-${item.name}`}>
            {item.name} · {item.zone} · {item.quantity} · {formatMoney(item.amount, item.currency_code)}
          </p>
        ))}
      </section>
    </>
  );
}

function CaBlock({
  title,
  currency,
  rows,
}: {
  title: string;
  currency: CurrencyCode;
  rows: RevenueResponse["rows"];
}) {
  if (rows.length === 0) {
    return (
      <article>
        <p className="on-label">{title}</p>
        <p className="on-small">Aucune donnée pour le moment</p>
      </article>
    );
  }
  const products = rows.reduce((s, r) => s + r.products_amount, 0);
  const fees = rows.reduce((s, r) => s + r.fulfillment_fees_paid, 0);
  const orders = rows.reduce((s, r) => s + r.count, 0);
  return (
    <article>
      <p className="on-label">{title}</p>
      <p className="on-small">CA produits</p>
      <strong>{formatMoney(products, currency)}</strong>
      <p className="on-small">Frais payés : {formatMoney(fees, currency)}</p>
      <p className="on-small">{orders} commande(s) confirmée(s)</p>
    </article>
  );
}

function RevenueChart({ series }: { series: SeriesResponse["series"] }) {
  if (series.length === 0) return <EmptyState title="Aucune donnée pour le moment" />;
  const points = series.flatMap((row) => row.points.map((point) => ({ ...point, zone: row.zone, currency: row.currency_code })));
  const max = Math.max(...points.map((point) => point.products_amount), 1);
  return (
    <div className="adm-chart">
      {points.map((point) => (
        <div className="adm-chart__row" key={`${point.zone}-${point.period}`}>
          <span className="adm-chart__label">{point.period.slice(5)}</span>
          <div className="adm-chart__bar-wrap">
            <div className="adm-chart__bar" style={{ width: `${Math.max(8, (point.products_amount / max) * 100)}%` }} />
          </div>
          <span className="adm-chart__value">{formatMoney(point.products_amount, point.currency)}</span>
        </div>
      ))}
    </div>
  );
}
