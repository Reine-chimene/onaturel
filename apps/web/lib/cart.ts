"use client";

import { useCallback, useEffect, useState } from "react";
import type { CartLine } from "@/components/commerce/CartDrawer";
import type { ZoneId } from "@/lib/zone";

function keyFor(zone: ZoneId) {
  return `on-cart-${zone}`;
}

function read(zone: ZoneId): CartLine[] {
  try {
    const raw = window.localStorage.getItem(keyFor(zone));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (line) =>
          line &&
          typeof line.id === "string" &&
          typeof line.name === "string" &&
          typeof line.unitPrice === "number" &&
          (line.currency === "XAF" || line.currency === "EUR"),
      )
      .map((line) => ({
        ...line,
        kind: line.kind === "pack" ? "pack" : "product",
        slug: line.slug ?? "",
        quantity: Math.max(1, line.quantity || 1),
        max: typeof line.max === "number" && line.max > 0 ? line.max : 1,
        image_url: line.image_url ?? null,
      }));
  } catch {
    return [];
  }
}

function write(zone: ZoneId, lines: CartLine[]) {
  window.localStorage.setItem(keyFor(zone), JSON.stringify(lines));
}

export function useCart(zone: ZoneId) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    setLines(read(zone));
  }, [zone]);

  const add = useCallback(
    (item: Omit<CartLine, "quantity"> & { quantity?: number }) => {
      if (item.max <= 0) return;
      setLines((current) => {
        const existing = current.find((line) => line.id === item.id && line.kind === (item.kind ?? "product"));
        const increment = item.quantity ?? 1;
        const kind = item.kind ?? "product";
        const next = existing
          ? current.map((line) =>
              line.id === item.id && line.kind === kind
                ? {
                    ...line,
                    ...item,
                    kind,
                    quantity: Math.min(line.quantity + increment, item.max),
                  }
                : line,
            )
          : [...current, { ...item, kind, quantity: Math.min(Math.max(increment, 1), item.max) }];
        write(zone, next);
        return next;
      });
    },
    [zone],
  );

  const onQuantity = useCallback(
    (id: string, quantity: number) => {
      setLines((current) => {
        const next =
          quantity <= 0
            ? current.filter((line) => line.id !== id)
            : current.map((line) =>
                line.id === id ? { ...line, quantity: Math.min(quantity, line.max) } : line,
              );
        write(zone, next);
        return next;
      });
    },
    [zone],
  );

  const remove = useCallback(
    (id: string) => {
      setLines((current) => {
        const next = current.filter((line) => line.id !== id);
        write(zone, next);
        return next;
      });
    },
    [zone],
  );

  const clear = useCallback(() => {
    write(zone, []);
    setLines([]);
  }, [zone]);

  return { lines, add, onQuantity, remove, clear };
}
