"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorNote } from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/admin/api";
import type { ProductAdmin } from "@/lib/admin/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StockStatus } from "@/lib/status";

export default function StockPage() {
  const [products, setProducts] = useState<ProductAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);

  function load() {
    return adminJson<ProductAdmin[]>("/api/v1/products").then(setProducts);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  async function save(productId: string, zoneId: string) {
    const key = `${productId}:${zoneId}`;
    const qty = Number(edits[key]);
    if (!Number.isInteger(qty) || qty < 0) {
      setError("Quantité invalide.");
      return;
    }
    setPending(key);
    setError(null);
    try {
      await adminJson("/api/v1/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({ product_id: productId, zone_id: zoneId, qty }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ajustement impossible.");
    } finally {
      setPending(null);
    }
  }

  async function saveThreshold(productId: string, zoneId: string, value: string) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("Seuil invalide.");
      return;
    }
    setError(null);
    try {
      await adminJson("/api/v1/inventory/threshold", {
        method: "PATCH",
        body: JSON.stringify({ product_id: productId, zone_id: zoneId, low_stock_threshold: parsed }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seuil impossible à enregistrer.");
    }
  }

  const ruptures = (products ?? []).filter((p) => p.zones.some((z) => z.stock <= 0));
  const low = (products ?? []).filter((p) => p.zones.some((z) => z.stock_status === "LOW_STOCK"));

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Inventaire</p>
          <h1 className="on-h1">Stock</h1>
        </div>
      </header>
      <p className="on-small">Cameroun et Europe sont séparés. L’ajustement passe par un mouvement de stock, jamais en écriture directe.</p>
      <ErrorNote message={error} />
      {products && products.length === 0 ? <EmptyState title="Aucun produit" /> : null}
      {products && products.length > 0 ? (
        <>
          <div className="on-table-wrap adm-table-desktop">
            <table className="on-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Stock Cameroun</th>
                  <th>Stock Europe</th>
                  <th>Seuil</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const cm = product.zones.find((z) => z.zone_slug === "cameroun");
                  const eu = product.zones.find((z) => z.zone_slug === "europe");
                  return (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{cm ? <ZoneStock productId={product.id} zone={cm} edits={edits} setEdits={setEdits} save={save} pending={pending} /> : "—"}</td>
                      <td>{eu ? <ZoneStock productId={product.id} zone={eu} edits={edits} setEdits={setEdits} save={save} pending={pending} /> : "—"}</td>
                      <td>
                        <div className="adm-actions">
                          {product.zones.map((zone) => (
                            <label key={zone.zone_id} className="on-small">
                              {zone.zone_slug === "cameroun" ? "CM" : "EU"}{" "}
                              <input
                                className="on-input"
                                style={{ width: "4rem" }}
                                key={`${product.id}-${zone.zone_id}-${zone.low_stock_threshold}`}
                                defaultValue={zone.low_stock_threshold ?? ""}
                                onBlur={(e) => {
                                  if (e.target.value !== String(zone.low_stock_threshold ?? "")) {
                                    saveThreshold(product.id, zone.zone_id, e.target.value);
                                  }
                                }}
                              />
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="adm-cards adm-cards--hide">
            {products.map((product) => (
              <article className="adm-card" key={product.id}>
                <p>{product.name}</p>
                {product.zones.map((zone) => (
                  <div key={zone.zone_id}>
                    <p className="on-small">{zone.zone_name}</p>
                    <ZoneStock
                      productId={product.id}
                      zone={zone}
                      edits={edits}
                      setEdits={setEdits}
                      save={save}
                      pending={pending}
                    />
                  </div>
                ))}
              </article>
            ))}
          </div>
        </>
      ) : null}
      <section style={{ marginTop: "2rem" }}>
        <h2 className="on-h3">Stock faible</h2>
        {products && low.length === 0 ? <EmptyState title="Aucun stock faible" /> : null}
        {low.map((product) => (
          <p key={product.id}>
            {product.name} — {product.zones.filter((z) => z.stock_status === "LOW_STOCK").map((z) => `${z.zone_name} (${z.stock})`).join(", ")}
          </p>
        ))}
      </section>
      <section style={{ marginTop: "2rem" }}>
        <h2 className="on-h3">Ruptures</h2>
        {products && ruptures.length === 0 ? <EmptyState title="Aucune rupture" /> : null}
        {ruptures.map((product) => (
          <p key={product.id}>
            {product.name} — {product.zones.filter((z) => z.stock <= 0).map((z) => z.zone_name).join(", ")}
          </p>
        ))}
      </section>
    </>
  );
}

function ZoneStock({
  productId,
  zone,
  edits,
  setEdits,
  save,
  pending,
}: {
  productId: string;
  zone: ProductAdmin["zones"][number];
  edits: Record<string, string>;
  setEdits: (fn: (current: Record<string, string>) => Record<string, string>) => void;
  save: (productId: string, zoneId: string) => void;
  pending: string | null;
}) {
  const key = `${productId}:${zone.zone_id}`;
  const value = edits[key] ?? String(zone.stock);
  return (
    <div className="adm-actions" style={{ alignItems: "center" }}>
      <StatusBadge kind="stock" value={zone.stock_status as StockStatus} />
      <input
        className="on-input"
        style={{ width: "5rem" }}
        value={value}
        onChange={(e) => setEdits((current) => ({ ...current, [key]: e.target.value }))}
      />
      <button type="button" className="on-btn on-btn--sm on-btn--secondary" disabled={pending === key} onClick={() => save(productId, zone.zone_id)}>
        OK
      </button>
    </div>
  );
}
