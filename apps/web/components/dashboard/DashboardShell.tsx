import type { ReactNode } from "react";
import { formatMoney, type CurrencyCode } from "@/lib/money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";

const NAV = [
  { group: null, items: [{ href: "#vue", label: "Vue d’ensemble", current: true }] },
  {
    group: "Catalogue",
    items: [
      { href: "#produits", label: "Produits" },
      { href: "#categories", label: "Catégories" },
      { href: "#packs", label: "Packs" },
      { href: "#promotions", label: "Promotions" },
    ],
  },
  {
    group: "Stock",
    items: [
      { href: "#inventaire", label: "Inventaire" },
      { href: "#mouvements", label: "Mouvements" },
      { href: "#alertes", label: "Alertes" },
      { href: "#transferts", label: "Transferts" },
    ],
  },
  {
    group: "Ventes",
    items: [
      { href: "#commandes", label: "Commandes" },
      { href: "#boutique", label: "Ventes boutique" },
    ],
  },
  {
    group: null,
    items: [
      { href: "#clients", label: "Clients" },
      { href: "#livraison", label: "Livraison / Expédition" },
      { href: "#rapports", label: "Rapports" },
      { href: "#utilisateurs", label: "Utilisateurs" },
      { href: "#audit", label: "Audit" },
      { href: "#parametres", label: "Paramètres" },
    ],
  },
];

export function ZoneSelector({
  value,
  onChange,
}: {
  value: "all" | "cameroun" | "europe";
  onChange: (value: "all" | "cameroun" | "europe") => void;
}) {
  return (
    <label className="on-field" style={{ minWidth: "12rem" }}>
      <span className="visually-hidden">Filtrer par zone</span>
      <select
        id="dash-zone"
        className="on-select"
        value={value}
        onChange={(event) => onChange(event.target.value as typeof value)}
      >
        <option value="all">Toutes les zones</option>
        <option value="cameroun">Cameroun</option>
        <option value="europe">Europe</option>
      </select>
    </label>
  );
}

export function MetricCard({
  zone,
  label,
  amount,
  currency,
}: {
  zone: string;
  label: string;
  amount: number;
  currency: CurrencyCode;
}) {
  return (
    <article className="on-metric">
      <p className="on-label">{zone}</p>
      <p className="on-small">{label}</p>
      <strong>{formatMoney(amount, currency)}</strong>
    </article>
  );
}

export function DashboardShell({
  zone,
  onZone,
  search,
  onSearch,
}: {
  zone: "all" | "cameroun" | "europe";
  onZone: (value: "all" | "cameroun" | "europe") => void;
  search: string;
  onSearch: (value: string) => void;
}) {
  return (
    <div className="on-dash">
      <aside className="on-dash__side" aria-label="Navigation propriétaire">
        <p className="on-logo" style={{ color: "var(--cream)" }}>
          O’Naturelle
        </p>
        <nav className="on-dash__nav">
          {NAV.map((block, index) => (
            <div key={block.group ?? `g-${index}`}>
              {block.group ? <p className="on-dash__group">{block.group}</p> : null}
              {block.items.map((item) => (
                <a key={item.href} href={item.href} aria-current={"current" in item ? "page" : undefined}>
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="on-dash__main">
        <nav className="on-dash__side-mobile" aria-label="Navigation propriétaire mobile">
          <a href="#vue">Vue</a>
          <a href="#produits">Produits</a>
          <a href="#inventaire">Stock</a>
          <a href="#commandes">Commandes</a>
          <a href="#rapports">Rapports</a>
        </nav>
        <header className="on-topbar">
          <div>
            <p className="on-label">Propriétaire</p>
            <p className="on-h3">Bonjour O’Naturelle</p>
          </div>
          <div className="on-ds__row">
            <ZoneSelector value={zone} onChange={onZone} />
            <SearchInput id="dash-search" value={search} onChange={onSearch} placeholder="Produits, commandes…" />
          </div>
        </header>
        <div style={{ padding: "1.5rem" }}>
          <div className="on-metrics">
            {([
              ...(zone === "europe"
                ? []
                : [{ zone: "Cameroun", amount: 850_000, currency: "XAF" as const }]),
              ...(zone === "cameroun"
                ? []
                : [{ zone: "Europe", amount: 124_000, currency: "EUR" as const }]),
            ]).map((item) => (
                <MetricCard
                  key={item.zone}
                  zone={item.zone}
                  label="Chiffre d’affaires du mois — produits"
                  amount={item.amount}
                  currency={item.currency}
                />
              ))}
          </div>
          <p className="on-small" style={{ marginTop: "0.75rem" }}>
            Les montants XAF et EUR restent séparés. Aucun total mixte.
          </p>
          <div className="on-alert">
            <span>3 produits en stock faible — Cameroun</span>
            <StatusBadge kind="stock" value="LOW_STOCK" />
          </div>
          <div className="on-alert">
            <span>Commande ON-24018 à traiter — Europe</span>
            <StatusBadge kind="order" value="NEW" />
          </div>
          <div className="on-table-wrap" style={{ marginTop: "1.5rem" }}>
            <table className="on-table">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Zone</th>
                  <th>Statut</th>
                  <th>Produits</th>
                  <th>Réception</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ON-24018</td>
                  <td>Europe</td>
                  <td>
                    <StatusBadge kind="order" value="NEW" />
                  </td>
                  <td>
                    <StatusBadge kind="payment" value="PAID" />
                  </td>
                  <td>
                    <StatusBadge kind="fulfillment" value="SHIPPING" />
                  </td>
                </tr>
                <tr>
                  <td>ON-24012</td>
                  <td>Cameroun</td>
                  <td>
                    <StatusBadge kind="order" value="PREPARING" />
                  </td>
                  <td>
                    <StatusBadge kind="payment" value="PAID" />
                  </td>
                  <td>
                    <StatusBadge kind="payment" value="DUE_ON_FULFILLMENT" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="on-chart" style={{ marginTop: "1.5rem" }}>
            Graphique — placeholder (données par devise uniquement)
          </div>
          <div className="on-upload" style={{ marginTop: "1.5rem" }}>
            Déposer une photographie produit
            <span className="on-small">JPEG ou WebP · optimisation automatique plus tard</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConfirmCopy({ children }: { children: ReactNode }) {
  return <p className="on-body">{children}</p>;
}
