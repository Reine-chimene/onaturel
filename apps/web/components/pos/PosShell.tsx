"use client";

import { useMemo, useState } from "react";
import { formatMoney, type CurrencyCode } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StockStatus } from "@/lib/status";

type Tile = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: StockStatus;
  promo?: boolean;
};

const SAMPLE: Tile[] = [
  { id: "1", name: "Produit exemple A", category: "Huiles", price: 8000, stock: "IN_STOCK" },
  { id: "2", name: "Produit exemple B", category: "Savons", price: 4500, stock: "LOW_STOCK", promo: true },
  { id: "3", name: "Produit exemple C", category: "Rituels", price: 12000, stock: "OUT_OF_STOCK" },
  { id: "4", name: "Produit exemple D", category: "Huiles", price: 6500, stock: "IN_STOCK" },
  { id: "5", name: "Produit exemple E", category: "Parfums", price: 15000, stock: "IN_STOCK" },
  { id: "6", name: "Produit exemple F", category: "Savons", price: 3500, stock: "IN_STOCK" },
];

const CATS = ["Tous", "Huiles", "Savons", "Rituels", "Parfums"];

export function PosShell({
  zoneName = "Cameroun",
  currency = "XAF",
}: {
  zoneName?: string;
  currency?: CurrencyCode;
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("Tous");
  const [cart, setCart] = useState<Record<string, number>>({});

  const products = useMemo(
    () =>
      SAMPLE.filter((item) => (cat === "Tous" ? true : item.category === cat)).filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [cat, query],
  );

  const lines = SAMPLE.filter((item) => cart[item.id]).map((item) => ({
    ...item,
    quantity: cart[item.id],
  }));
  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

  function add(id: string, stock: StockStatus) {
    if (stock === "OUT_OF_STOCK") return;
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  }

  return (
    <div className="on-pos">
      <div className="on-pos__main">
        <div className="on-pos__bar">
          <div>
            <p className="on-label">Caisse</p>
            <p className="on-h3">O’Naturelle · {zoneName}</p>
          </div>
          <p className="on-small">Zone assignée — non modifiable</p>
        </div>
        <div style={{ padding: "0 1rem" }}>
          <SearchInput id="pos-search" value={query} onChange={setQuery} placeholder="Nom ou catégorie" />
        </div>
        <div className="on-pos__cats">
          {CATS.map((item) => (
            <button
              key={item}
              type="button"
              className="on-chip"
              aria-pressed={cat === item}
              onClick={() => setCat(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="on-pos__grid">
          {products.map((item) => (
            <button
              key={item.id}
              type="button"
              className="on-pos-tile"
              disabled={item.stock === "OUT_OF_STOCK"}
              onClick={() => add(item.id, item.stock)}
            >
              <span>
                <strong>{item.name}</strong>
                <span className="on-small" style={{ display: "block" }}>
                  {item.category}
                </span>
              </span>
              <span>
                {formatMoney(item.price, currency)}
                <span style={{ display: "block", marginTop: 4 }}>
                  <StatusBadge kind="stock" value={item.stock} />
                  {item.promo ? <StatusBadge kind="tag" value="PROMO" /> : null}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <aside className="on-pos__cart" aria-label="Panier caisse">
        <div className="on-pos__bar">
          <p className="on-h3">Panier</p>
        </div>
        <div className="on-pos__lines">
          {lines.length === 0 ? (
            <p className="on-small">Touchez un produit pour l’ajouter.</p>
          ) : (
            lines.map((line) => (
              <p key={line.id}>
                {line.name} × {line.quantity}
                <span className="on-small" style={{ display: "block" }}>
                  {formatMoney(line.price * line.quantity, currency)}
                </span>
              </p>
            ))
          )}
        </div>
        <div className="on-pos__pay">
          <p className="on-price">{formatMoney(total, currency)}</p>
          <Button size="pos" disabled={lines.length === 0}>
            Espèces
          </Button>
          <Button size="pos" variant="secondary" disabled={lines.length === 0}>
            Mobile Money
          </Button>
          <Button size="pos" variant="ghost" disabled={lines.length === 0}>
            Imprimer le reçu
          </Button>
        </div>
      </aside>
    </div>
  );
}
