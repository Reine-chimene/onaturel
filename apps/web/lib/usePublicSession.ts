"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { persistZone, readStoredZone, type ZoneId } from "@/lib/zone";

export function usePublicSession() {
  const [zone, setZone] = useState<ZoneId>("cameroun");
  const [hydrated, setHydrated] = useState(false);
  const [pendingZone, setPendingZone] = useState<ZoneId | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart(zone);

  useEffect(() => {
    setZone(readStoredZone());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistZone(zone);
  }, [zone, hydrated]);

  function onZone(next: ZoneId) {
    if (next === zone) return;
    if (cart.lines.length > 0) {
      setPendingZone(next);
      return;
    }
    setZone(next);
  }

  function confirmZone() {
    if (!pendingZone) return;
    setZone(pendingZone);
    setPendingZone(null);
  }

  function cancelZone() {
    setPendingZone(null);
  }

  return {
    zone,
    onZone,
    hydrated,
    pendingZone,
    confirmZone,
    cancelZone,
    cartOpen,
    setCartOpen,
    ...cart,
  };
}
