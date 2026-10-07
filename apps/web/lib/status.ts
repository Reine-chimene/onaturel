export const stockLabels = {
  IN_STOCK: "En stock",
  LOW_STOCK: "Stock faible",
  OUT_OF_STOCK: "Rupture de stock",
} as const;

export const orderLabels = {
  NEW: "Nouvelle",
  CONFIRMED: "Confirmée",
  PREPARING: "Préparation",
  READY: "Prête",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
} as const;

export const paymentLabels = {
  PAID: "Payé",
  PENDING: "En attente",
  PARTIAL: "Partiel",
  DUE_ON_FULFILLMENT: "Dû à la livraison",
  NOT_APPLICABLE: "Non applicable",
} as const;

export const fulfillmentLabels = {
  DELIVERY: "Livraison",
  SHIPPING: "Expédition",
  PICKUP: "Retrait",
} as const;

export type StockStatus = keyof typeof stockLabels;
export type OrderStatus = keyof typeof orderLabels;
export type PaymentStatus = keyof typeof paymentLabels;
export type FulfillmentMode = keyof typeof fulfillmentLabels;

export function statusTone(
  kind: "stock" | "order" | "payment" | "fulfillment" | "tag",
  value: string,
): "stock" | "low" | "out" | "new" | "promo" | "paid" | "unpaid" | "partial" | "neutral" {
  if (kind === "stock") {
    if (value === "OUT_OF_STOCK") return "out";
    if (value === "LOW_STOCK") return "low";
    return "stock";
  }
  if (kind === "order") {
    if (value === "CANCELLED") return "out";
    if (value === "NEW") return "new";
    if (value === "DELIVERED" || value === "CONFIRMED") return "paid";
    return "neutral";
  }
  if (kind === "payment") {
    if (value === "PAID") return "paid";
    if (value === "PARTIAL" || value === "DUE_ON_FULFILLMENT") return "partial";
    if (value === "NOT_APPLICABLE") return "neutral";
    return "unpaid";
  }
  if (kind === "tag") {
    if (value === "NEW") return "new";
    if (value === "PROMO") return "promo";
  }
  return "neutral";
}
