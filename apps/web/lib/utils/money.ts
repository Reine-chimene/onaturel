import { badRequest } from "@/lib/utils/errors";

export function convert(_amount: number, _from: string, _to: string): never {
  badRequest("Aucune conversion automatique de devise n'est autorisée.");
}

export function assertSameCurrency(codeA: string, codeB: string): void {
  if (codeA !== codeB) {
    badRequest("Impossible de mélanger deux devises dans un même total.");
  }
}

export function assertNoMixedTotal(rows: { currency_code: string }[]): void {
  const codes = new Set(rows.map((row) => row.currency_code));
  if (codes.size > 1) {
    badRequest("Le chiffre d'affaires ne peut pas mélanger XAF et EUR dans un total unique.");
  }
}

export function formatAmount(amountMinor: number, currencyCode: string, minorUnits: number): string {
  if (minorUnits === 0) {
    return `${amountMinor.toLocaleString("fr-FR").replace(/,/g, " ")} ${currencyCode}`;
  }
  const scale = 10 ** minorUnits;
  const major = Math.trunc(amountMinor / scale);
  const minor = Math.abs(amountMinor % scale)
    .toString()
    .padStart(minorUnits, "0");
  return `${major},${minor} ${currencyCode}`;
}

export function sellingPrice(priceAmount: number, promoAmount: number | null, promoActive: boolean): number {
  if (promoActive && promoAmount != null) return promoAmount;
  return priceAmount;
}
