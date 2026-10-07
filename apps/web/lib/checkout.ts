import type { CurrencyCode } from "@/lib/money";
import type { ZoneId } from "@/lib/zone";
import { API_URL as API } from "@/lib/apiUrl";

export type CartKind = "product" | "pack";

export type QuoteLine = {
  kind: CartKind;
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  quantity: number;
  max_quantity: number;
  list_price: number;
  unit_price: number;
  promo_active: boolean;
  line_total: number;
  ok: boolean;
  issue: string | null;
};

export type CartQuote = {
  zone_slug: string;
  currency_code: CurrencyCode;
  products_amount: number;
  can_submit: boolean;
  lines: QuoteLine[];
};

export type FulfillmentOption = {
  mode: "DELIVERY" | "SHIPPING" | "PICKUP";
  label: string;
  is_enabled: boolean;
  fee_policy: string;
  default_fee_amount: number | null;
  fee_amount: number;
  fee_known: boolean;
  fee_payment_status: string;
};

export type CheckoutConfig = {
  zone_slug: string;
  zone_name: string;
  currency_code: CurrencyCode;
  fulfillment_modes: FulfillmentOption[];
};

export type OrderItemOut = {
  kind: CartKind;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type PublicOrder = {
  number: string;
  status: string;
  zone_slug: string;
  zone_name: string;
  currency_code: CurrencyCode;
  customer_name: string;
  customer_phone: string;
  fulfillment_mode: string;
  fulfillment_label: string;
  city: string | null;
  neighborhood: string | null;
  products_amount: number;
  fulfillment_fee_amount: number;
  fee_known: boolean;
  products_payment_status: string;
  fulfillment_payment_status: string;
  pay_now_amount: number;
  items: OrderItemOut[];
};

export type QuoteItem = {
  product_id?: string;
  bundle_id?: string;
  quantity: number;
};

export async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    const detail = body.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  } catch {
    /* ignore */
  }
  if (response.status === 409) return "Le stock a changé. Merci d’ajuster les quantités.";
  if (response.status === 404) return "Cette information n’est plus disponible.";
  return "La demande n’a pas pu aboutir. Merci de réessayer dans un instant.";
}

export async function fetchCheckoutConfig(zone: ZoneId): Promise<CheckoutConfig> {
  const response = await fetch(`${API}/api/v1/public/checkout?zone=${encodeURIComponent(zone)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(await readApiError(response));
  return (await response.json()) as CheckoutConfig;
}

export async function quoteCart(zone: ZoneId, items: QuoteItem[]): Promise<CartQuote> {
  const response = await fetch(`${API}/api/v1/public/cart/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zone, items }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(await readApiError(response));
  return (await response.json()) as CartQuote;
}

export async function createOrder(payload: {
  zone: ZoneId;
  fulfillment_mode: string;
  customer_name: string;
  customer_phone: string;
  city?: string | null;
  neighborhood?: string | null;
  items: QuoteItem[];
}): Promise<PublicOrder> {
  const response = await fetch(`${API}/api/v1/public/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(await readApiError(response));
  return (await response.json()) as PublicOrder;
}

export async function fetchOrder(number: string): Promise<PublicOrder | "not-found"> {
  const response = await fetch(`${API}/api/v1/public/orders/${encodeURIComponent(number)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404) return "not-found";
  if (!response.ok) throw new Error(await readApiError(response));
  return (await response.json()) as PublicOrder;
}

export function toQuoteItems(
  lines: { id: string; kind?: string; quantity: number }[],
): QuoteItem[] {
  return lines.map((line) =>
    line.kind === "pack"
      ? { bundle_id: line.id, quantity: line.quantity }
      : { product_id: line.id, quantity: line.quantity },
  );
}
