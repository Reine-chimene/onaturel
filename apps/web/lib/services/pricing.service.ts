import { prisma } from "@/lib/db/prisma";
import { notFound } from "@/lib/utils/errors";
import { sellingPrice } from "@/lib/utils/money";

export function packBuildableQty(neededAndHave: [number, number][]): number {
  if (!neededAndHave.length) return 0;
  const possible: number[] = [];
  for (const [needed, have] of neededAndHave) {
    if (needed <= 0) return 0;
    possible.push(Math.floor(Math.max(0, have) / needed));
  }
  return Math.min(...possible);
}

export async function sellingPriceForProduct(productId: string, zoneId: string): Promise<number> {
  const row = await prisma.productZonePrice.findUnique({
    where: { product_id_zone_id: { product_id: productId, zone_id: zoneId } },
  });
  if (!row || !row.is_available) notFound("Ce produit n'a pas de prix dans cette zone.");
  return sellingPrice(row.price_amount, row.promo_price_amount, row.promo_is_active);
}

export async function bundleBuildableQty(bundleId: string, zoneId: string): Promise<number> {
  const price = await prisma.bundleZonePrice.findUnique({
    where: { bundle_id_zone_id: { bundle_id: bundleId, zone_id: zoneId } },
  });
  if (!price || !price.is_available) return 0;
  const items = await prisma.bundleItem.findMany({ where: { bundle_id: bundleId } });
  if (!items.length) return 0;
  const possible: number[] = [];
  for (const item of items) {
    if (item.quantity <= 0) return 0;
    const position = await prisma.inventoryPosition.findUnique({
      where: { product_id_zone_id: { product_id: item.product_id, zone_id: zoneId } },
    });
    const qty = position?.qty ?? 0;
    possible.push(Math.floor(qty / item.quantity));
  }
  return possible.length ? Math.min(...possible) : 0;
}
