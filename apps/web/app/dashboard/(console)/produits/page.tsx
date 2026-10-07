"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorNote } from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/admin/api";
import type { CategoryAdmin, ProductAdmin, ZonePriceRow } from "@/lib/admin/types";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StockStatus } from "@/lib/status";

function zoneOf(product: ProductAdmin, slug: string): ZonePriceRow | undefined {
  return product.zones.find((zone) => zone.zone_slug === slug);
}

export default function ProduitsPage() {
  const [products, setProducts] = useState<ProductAdmin[] | null>(null);
  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState("all");
  const [zone, setZone] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    return Promise.all([
      adminJson<ProductAdmin[]>("/api/v1/products"),
      adminJson<CategoryAdmin[]>("/api/v1/categories"),
    ]).then(([rows, cats]) => {
      setProducts(rows);
      setCategories(cats);
    });
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      if (needle && !`${product.name} ${product.category_name ?? ""}`.toLowerCase().includes(needle)) return false;
      if (category && product.category_id !== category) return false;
      const cm = zoneOf(product, "cameroun");
      const eu = zoneOf(product, "europe");
      const scoped = zone === "europe" ? eu : zone === "cameroun" ? cm : null;
      if (availability === "rupture") {
        const rows = scoped ? [scoped] : product.zones;
        if (!rows.some((row) => row.stock_status === "OUT_OF_STOCK")) return false;
      }
      if (availability === "faible") {
        const rows = scoped ? [scoped] : product.zones;
        if (!rows.some((row) => row.stock_status === "LOW_STOCK")) return false;
      }
      if (availability === "actif" && !product.is_active) return false;
      if (availability === "inactif" && product.is_active) return false;
      return true;
    });
  }, [products, query, category, availability, zone]);

  async function remove(product: ProductAdmin) {
    if (!window.confirm(`Supprimer définitivement « ${product.name} » ?`)) return;
    setBusyId(product.id);
    setError(null);
    try {
      await adminJson(`/api/v1/products/${product.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Catalogue</p>
          <h1 className="on-h1">Produits</h1>
        </div>
        <Link className="on-btn on-btn--primary" href="/dashboard/produits/nouveau">
          + Ajouter un produit
        </Link>
      </header>

      <div className="adm-toolbar">
        <label className="on-field">
          <span className="visually-hidden">Recherche</span>
          <input className="on-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un produit" />
        </label>
        <label className="on-field">
          <span className="visually-hidden">Catégorie</span>
          <select className="on-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Toutes les catégories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="on-field">
          <span className="visually-hidden">Disponibilité</span>
          <select className="on-select" value={availability} onChange={(e) => setAvailability(e.target.value)}>
            <option value="all">Tous les statuts</option>
            <option value="actif">Actifs</option>
            <option value="inactif">Inactifs</option>
            <option value="rupture">Rupture</option>
            <option value="faible">Stock faible</option>
          </select>
        </label>
        <label className="on-field">
          <span className="visually-hidden">Zone</span>
          <select className="on-select" value={zone} onChange={(e) => setZone(e.target.value)}>
            <option value="all">Toutes les zones</option>
            <option value="cameroun">Cameroun</option>
            <option value="europe">Europe</option>
          </select>
        </label>
      </div>

      <ErrorNote message={error} />
      {!products && !error ? <p className="on-small">Chargement…</p> : null}

      {products && products.length === 0 ? (
        <EmptyState title="Aucun produit" text="Ajoutez le premier produit du catalogue.">
          <Link className="on-btn on-btn--primary" href="/dashboard/produits/nouveau">+ Ajouter un produit</Link>
        </EmptyState>
      ) : null}

      {products && products.length > 0 && filtered.length === 0 ? (
        <EmptyState title="Aucun résultat" text="Modifiez la recherche ou les filtres." />
      ) : null}

      {filtered.length > 0 ? (
        <>
          <div className="on-table-wrap adm-table-desktop">
            <table className="on-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Nom</th>
                  <th>Catégorie</th>
                  <th>Prix Cameroun</th>
                  <th>Stock Cameroun</th>
                  <th>Prix Europe</th>
                  <th>Stock Europe</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const cm = zoneOf(product, "cameroun");
                  const eu = zoneOf(product, "europe");
                  return (
                    <tr key={product.id}>
                      <td>{product.image_url ? <img className="adm-thumb" src={product.image_url} alt="" /> : "—"}</td>
                      <td><Link href={`/dashboard/produits/${product.id}`}>{product.name}</Link></td>
                      <td>{product.category_name ?? "—"}</td>
                      <td>{cm?.price_amount != null ? formatMoney(cm.price_amount, "XAF") : "—"}</td>
                      <td>{cm ? <><StatusBadge kind="stock" value={cm.stock_status as StockStatus} /> {cm.stock}</> : "—"}</td>
                      <td>{eu?.price_amount != null ? formatMoney(eu.price_amount, "EUR") : "—"}</td>
                      <td>{eu ? <><StatusBadge kind="stock" value={eu.stock_status as StockStatus} /> {eu.stock}</> : "—"}</td>
                      <td>
                        <span className={`adm-status${product.is_active ? "" : " is-off"}`}>
                          {product.is_active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td>
                        <div className="adm-actions">
                          <Link className="on-btn on-btn--secondary on-btn--sm" href={`/dashboard/produits/${product.id}`}>Modifier</Link>
                          <button type="button" className="on-btn on-btn--danger on-btn--sm" disabled={busyId === product.id} onClick={() => remove(product)}>
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="adm-cards adm-cards--hide">
            {filtered.map((product) => {
              const cm = zoneOf(product, "cameroun");
              const eu = zoneOf(product, "europe");
              return (
                <article className="adm-card" key={product.id}>
                  <div className="adm-prod-row">
                    {product.image_url ? <img className="adm-thumb" src={product.image_url} alt="" /> : <div className="adm-thumb" />}
                    <div>
                      <Link href={`/dashboard/produits/${product.id}`}>{product.name}</Link>
                      <p className="on-small">{product.category_name ?? "Sans catégorie"}</p>
                    </div>
                  </div>
                  <p className="on-small">
                    Cameroun : {cm?.price_amount != null ? formatMoney(cm.price_amount, "XAF") : "—"} · stock {cm?.stock ?? 0}
                  </p>
                  <p className="on-small">
                    Europe : {eu?.price_amount != null ? formatMoney(eu.price_amount, "EUR") : "—"} · stock {eu?.stock ?? 0}
                  </p>
                  <div className="adm-actions">
                    <Link className="on-btn on-btn--secondary on-btn--sm" href={`/dashboard/produits/${product.id}`}>Modifier</Link>
                    <button type="button" className="on-btn on-btn--danger on-btn--sm" onClick={() => remove(product)}>Supprimer</button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </>
  );
}
