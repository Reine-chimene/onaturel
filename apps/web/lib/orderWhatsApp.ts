export type WhatsAppCurrency = "XAF" | "EUR";

export type WhatsAppOrderLine = {
  name: string;
  quantity: number;
  line_total: number;
};

export type WhatsAppOrderPayload = {
  customer_name: string;
  customer_phone: string;
  fulfillment_mode: string;
  city: string | null;
  neighborhood: string | null;
  currency_code: WhatsAppCurrency;
  items: WhatsAppOrderLine[];
};

export function shortCustomerName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 3) return parts.join(" ");
  return [parts[0], ...parts.slice(-2)].join(" ");
}

export function whatsappPhone(raw: string): string {
  const compact = raw.trim().replace(/[\s.-]/g, "");
  return compact.replace(/^\+?237/, "") || compact;
}

function placeForMode(order: WhatsAppOrderPayload): string {
  if (order.fulfillment_mode === "DELIVERY") return order.neighborhood?.trim() ?? "";
  if (order.fulfillment_mode === "SHIPPING") return order.city?.trim() ?? "";
  return "";
}

function formatLinePrice(amountMinor: number, currency: WhatsAppCurrency): string {
  const grouped = (value: number, fractionDigits: number) =>
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
      .format(value)
      .replace(/\u00A0|\u202F/g, " ");

  if (currency === "EUR") return `${grouped(amountMinor / 100, 2)} EUR`;
  return `${grouped(amountMinor, 0)} FCFA`;
}

export function orderWhatsAppMessage(order: WhatsAppOrderPayload): string {
  const identity = [shortCustomerName(order.customer_name), whatsappPhone(order.customer_phone), placeForMode(order)]
    .filter((part) => part.length > 0)
    .join(", ");

  const lines = ["Bonjour O'Naturelle,", "", identity, ""];

  for (const item of order.items) {
    const name = item.name.trim();
    if (!name || item.quantity <= 0) continue;
    lines.push(`${name} \u00D7 ${item.quantity} \u2014 ${formatLinePrice(item.line_total, order.currency_code)}`);
  }

  lines.push("", "Merci.");
  return lines.join("\n");
}
