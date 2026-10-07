"use client";

import Link from "next/link";
import { formatMoney, type CurrencyCode } from "@/lib/money";
import { QuantitySelector } from "@/components/commerce/ProductTools";

export type CartKind = "product" | "pack";

export type CartLine = {
  id: string;
  kind: CartKind;
  slug: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: CurrencyCode;
  max: number;
  image_url?: string | null;
};

export function CartDrawer({
  open,
  onClose,
  lines,
  onQuantity,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  onQuantity: (id: string, quantity: number) => void;
  onRemove?: (id: string) => void;
}) {
  if (!open) return null;
  const currency = lines[0]?.currency ?? "XAF";
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  return (
    <div className="on-overlay" onClick={onClose} role="presentation">
      <aside
        className="on-drawer chk-drawer"
        role="dialog"
        aria-label="Panier"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="on-h2">Panier</h2>
        {lines.length === 0 ? (
          <p className="on-small">Votre panier est vide.</p>
        ) : (
          <ul className="chk-lines">
            {lines.map((line) => (
              <li key={`${line.kind}-${line.id}`} className="chk-line">
                <span className="chk-line__visual">
                  {line.image_url ? <img src={line.image_url} alt="" /> : <span>{line.kind === "pack" ? "Pack" : "Soin"}</span>}
                </span>
                <div className="chk-line__body">
                  <p className="chk-line__name">{line.name}</p>
                  <p className="on-small">{formatMoney(line.unitPrice, line.currency)}</p>
                  <QuantitySelector
                    value={line.quantity}
                    max={line.max}
                    min={0}
                    onChange={(quantity) => onQuantity(line.id, quantity)}
                  />
                  <p className="chk-line__sub">{formatMoney(line.unitPrice * line.quantity, line.currency)}</p>
                  {onRemove ? (
                    <button type="button" className="chk-line__remove" onClick={() => onRemove(line.id)}>
                      Retirer
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="on-label">Total des produits</p>
        <p className="on-price">{formatMoney(total, currency)}</p>
        <p className="on-small">Les frais de réception sont indiqués à la commande, séparément.</p>
        <div className="chk-drawer__actions">
          <Link className="on-btn on-btn--secondary" href="/panier" onClick={onClose}>
            Voir le panier
          </Link>
          <Link
            className={`on-btn on-btn--primary${lines.length === 0 ? " is-disabled" : ""}`}
            href={lines.length === 0 ? "/panier" : "/commande"}
            onClick={lines.length === 0 ? (event) => event.preventDefault() : onClose}
            aria-disabled={lines.length === 0}
          >
            Commander
          </Link>
        </div>
      </aside>
    </div>
  );
}
