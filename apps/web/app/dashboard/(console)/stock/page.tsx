"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorNote } from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/admin/api";
import type { ProductAdmin } from "@/lib/admin/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StockStatus } from "@/lib/status";

type StockView = "all" | "low" | "out";

export default function StockPage() {
  const [products, setProducts] = useState<ProductAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [view, setView] = useState<StockView>("all");

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

  const low = useMemo(
    () => (products ?? []).filter((p) => p.zones.some((z) => z.stock_status === "LOW_STOCK")),
    [products],
  );
  const ruptures = useMemo(
    () => (products ?? []).filter((p) => p.zones.some((z) => z.stock_status === "OUT_OF_STOCK")),
    [products],
  );

  const visible = useMemo(() => {
    if (!products) return [];
    if (view === "low") return low;
    if (view === "out") return ruptures;
    return products;
  }, [products, view, low, ruptures]);

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Inventaire</p>
          <h1 className="on-h1">Stock</h1>
        </div>
      </header>

      <div className="adm-filters" style={{ marginBottom: "1.25rem" }}>
        <button type="button" className="adm-chip" aria-pressed={view === "all"} onClick={() => setView("all")}>
          Tout le stock
        </button>
        <button type="button" className="adm-chip" aria-pressed={view === "low"} onClick={() => setView("low")}>
          Stock faible ({low.length})
        </button>
        <button type="button" className="adm-chip" aria-pressed={view === "out"} onClick={() => setView("out")}>
          Ruptures ({ruptures.length})
        </button>
      </div>

      <ErrorNote message={error} />
      {!products && !error ? <p className="on-small">Chargement…</p> : null}
      {products && visible.length === 0 ? (
        <EmptyState
          title={view === "out" ? "Aucune rupture" : view === "low" ? "Aucun stock faible" : "Aucun produit"}
          text={
            view === "out"
              ? "Tous les produits ont du stock disponible."
              : view === "low"
                ? "Les niveaux de stock sont corrects."
                : undefined
          }
        />
      ) : null}

      {products && visible.length > 0 ? (
        <>
          <div className="on-table-wrap adm-table-desktop">
            <table className="on-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Zone</th>
                  <th>Statut</th>
                  <th>Quantité</th>
                  <th>Seuil alerte</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.flatMap((product) =>
                  product.zones
                    .filter((zone) => {
                      if (view === "low") return zone.stock_status === "LOW_STOCK";
                      if (view === "out") return zone.stock_status === "OUT_OF_STOCK";
                      return true;
                    })
                    .map((zone) => (
                      <tr key={`${product.id}-${zone.zone_id}`}>
                        <td>
                          <Link href={`/dashboard/produits/${product.id}`}>{product.name}</Link>
                        </td>
                        <td>{zone.zone_name}</td>
                        <td>
                          <StatusBadge kind="stock" value={zone.stock_status as StockStatus} />
                        </td>
                        <td>
                          <ZoneStock
                            productId={product.id}
                            zone={zone}
                            edits={edits}
                            setEdits={setEdits}
                            save={save}
                            pending={pending}
                          />
                        </td>
                        <td>
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
                        </td>
                        <td>
                          <Link className="on-btn on-btn--ghost on-btn--sm" href={`/dashboard/produits/${product.id}`}>
                            Modifier
                          </Link>
                        </td>
                      </tr>
                    )),
                )}
              </tbody>
            </table>
          </div>
          <div className="adm-cards adm-cards--hide">
            {visible.map((product) => (
              <article className="adm-card" key={product.id}>
                <Link href={`/dashboard/produits/${product.id}`}>{product.name}</Link>
                {product.zones
                  .filter((zone) => {
                    if (view === "low") return zone.stock_status === "LOW_STOCK";
                    if (view === "out") return zone.stock_status === "OUT_OF_STOCK";
                    return true;
                  })
                  .map((zone) => (
                    <div key={zone.zone_id} style={{ marginTop: "0.75rem" }}>
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
      <input
        className="on-input"
        style={{ width: "5rem" }}
        value={value}
        onChange={(e) => setEdits((current) => ({ ...current, [key]: e.target.value }))}
      />
      <button
        type="button"
        className="on-btn on-btn--sm on-btn--secondary"
        disabled={pending === key}
        onClick={() => save(productId, zone.zone_id)}
      >
        Enregistrer
      </button>
    </div>
  );
}
