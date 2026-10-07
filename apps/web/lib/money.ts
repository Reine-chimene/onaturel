export const currencies = {
  XAF: { code: "XAF", symbol: "FCFA", minorUnits: 0, name: "Franc CFA" },
  EUR: { code: "EUR", symbol: "€", minorUnits: 2, name: "Euro" },
} as const;

export type CurrencyCode = keyof typeof currencies;

export function formatMoney(
  amountMinor: number,
  currency: CurrencyCode,
): string {
  const meta = currencies[currency];
  if (meta.minorUnits === 0) {
    return `${new Intl.NumberFormat("fr-FR").format(amountMinor)}\u00A0${meta.symbol}`;
  }
  const major = amountMinor / 10 ** meta.minorUnits;
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major)}\u00A0${meta.symbol}`;
}

export function promoPercent(price: number, promo: number): number {
  if (price <= 0) return 0;
  return Math.round(((price - promo) / price) * 100);
}

export function schemaPrice(amountMinor: number, currency: CurrencyCode): string {
  const meta = currencies[currency];
  if (meta.minorUnits === 0) return String(amountMinor);
  return (amountMinor / 10 ** meta.minorUnits).toFixed(meta.minorUnits);
}

export function parseMajorToMinor(value: string, currency: CurrencyCode): number | null {
  const trimmed = value.replace(/\s/g, "").replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  const meta = currencies[currency];
  return Math.round(n * 10 ** meta.minorUnits);
}

export function minorToInput(amount: number | null | undefined, currency: CurrencyCode): string {
  if (amount == null) return "";
  return schemaPrice(amount, currency);
}
