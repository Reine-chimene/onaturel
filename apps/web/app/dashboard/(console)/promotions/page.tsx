"use client";

import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorNote } from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/admin/api";
import type { PackAdmin, ProductAdmin, PromotionAdmin, ZoneOut } from "@/lib/admin/types";
import { formatMoney, parseMajorToMinor, type CurrencyCode } from "@/lib/money";

export default function PromotionsPage() {
  const [rows, setRows] = useState<PromotionAdmin[] | null>(null);
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [packs, setPacks] = useState<PackAdmin[]>([]);
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const [bundleId, setBundleId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [price, setPrice] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");

  function load() {
    return adminJson<PromotionAdmin[]>("/api/v1/promotions").then(setRows);
  }

  useEffect(() => {
    Promise.all([
      load(),
      adminJson<ProductAdmin[]>("/api/v1/products"),
      adminJson<PackAdmin[]>("/api/v1/packs"),
      adminJson<ZoneOut[]>("/api/v1/zones/all"),
    ])
      .then(([, p, b, z]) => {
        setProducts(p);
        setPacks(b);
        setZones(z);
        if (z[0]) setZoneId(z[0].id);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const zone = zones.find((item) => item.id === zoneId);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!zone) return;
    const amount = parseMajorToMinor(price, zone.currency.code as CurrencyCode);
    if (amount == null) {
      setError("Prix promotionnel invalide.");
      return;
    }
    if (!productId && !bundleId) {
      setError("Choisissez un produit ou un pack.");
      return;
    }
    setError(null);
    try {
      await adminJson("/api/v1/promotions", {
        method: "POST",
        body: JSON.stringify({
          product_id: productId || null,
          bundle_id: bundleId || null,
          zone_id: zoneId,
          promo_price_amount: amount,
          is_active: true,
          starts_at: starts ? new Date(starts).toISOString() : null,
          ends_at: ends ? new Date(ends).toISOString() : null,
        }),
      });
      setPrice("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    }
  }

  async function toggle(row: PromotionAdmin) {
    await adminJson(`/api/v1/promotions/${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !row.is_active }),
    });
    await load();
  }

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Catalogue</p>
          <h1 className="on-h1">Promotions</h1>
        </div>
      </header>
      <ErrorNote message={error} />
      <form className="adm-form" onSubmit={onSubmit}>
        <label className="on-field">
          <span>Produit</span>
          <select className="on-select" value={productId} onChange={(e) => { setProductId(e.target.value); if (e.target.value) setBundleId(""); }}>
            <option value="">—</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="on-field">
          <span>Pack</span>
          <select className="on-select" value={bundleId} onChange={(e) => { setBundleId(e.target.value); if (e.target.value) setProductId(""); }}>
            <option value="">—</option>
            {packs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="on-field">
          <span>Zone</span>
          <select className="on-select" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name} ({z.currency.code})</option>)}
          </select>
        </label>
        <label className="on-field">
          <span>Prix promotionnel {zone ? `(${zone.currency.code})` : ""}</span>
          <input className="on-input" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </label>
        <label className="on-field">
          <span>Début</span>
          <input className="on-input" type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} />
        </label>
        <label className="on-field">
          <span>Fin</span>
          <input className="on-input" type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
        </label>
        <button className="on-btn on-btn--primary" type="submit">Créer la promotion</button>
      </form>
      {rows && rows.length === 0 ? <EmptyState title="Aucune promotion" /> : null}
      {rows && rows.length > 0 ? (
        <div className="on-table-wrap" style={{ marginTop: "2rem" }}>
          <table className="on-table">
            <thead>
              <tr>
                <th>Cible</th>
                <th>Zone</th>
                <th>Prix normal</th>
                <th>Prix promo</th>
                <th>Dates</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const z = zones.find((item) => item.id === row.zone_id);
                const product = products.find((item) => item.id === row.product_id);
                const pack = packs.find((item) => item.id === row.bundle_id);
                const zonePrice = product?.zones.find((item) => item.zone_id === row.zone_id)
                  ?? pack?.zones.find((item) => item.zone_id === row.zone_id);
                const listPrice = zonePrice?.price_amount;
                return (
                  <tr key={row.id}>
                    <td>{row.product_name ?? row.bundle_name}</td>
                    <td>{z?.name}</td>
                    <td>{z && listPrice != null ? formatMoney(listPrice, z.currency.code as CurrencyCode) : "—"}</td>
                    <td>{z ? formatMoney(row.promo_price_amount, z.currency.code as CurrencyCode) : row.promo_price_amount}</td>
                    <td className="on-small">
                      {row.starts_at ? new Date(row.starts_at).toLocaleDateString("fr-FR") : "—"}
                      {" → "}
                      {row.ends_at ? new Date(row.ends_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td>{row.is_live ? "Active" : row.is_active ? "Planifiée" : "Inactive"}</td>
                    <td>
                      <button type="button" className="on-btn on-btn--sm on-btn--secondary" onClick={() => toggle(row)}>
                        {row.is_active ? "Désactiver" : "Activer"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
