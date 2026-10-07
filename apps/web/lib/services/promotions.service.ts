import type { Promotion } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { badRequest, notFound } from "@/lib/utils/errors";

export function promotionIsLive(promo: Pick<Promotion, "is_active" | "starts_at" | "ends_at">, now = new Date()): boolean {
  if (!promo.is_active) return false;
  if (promo.starts_at && now < promo.starts_at) return false;
  if (promo.ends_at && now > promo.ends_at) return false;
  return true;
}

export async function syncPromotionPrice(promo: Promotion): Promise<void> {
  const live = promotionIsLive(promo);
  if (promo.product_id) {
    const row = await prisma.productZonePrice.findUnique({
      where: { product_id_zone_id: { product_id: promo.product_id, zone_id: promo.zone_id } },
    });
    if (!row) {
      badRequest("Ce produit n’a pas de prix dans la zone choisie. Définissez d’abord le prix de zone.");
    }
    await prisma.productZonePrice.update({
      where: { id: row.id },
      data: { promo_price_amount: promo.promo_price_amount, promo_is_active: live },
    });
    return;
  }
  if (promo.bundle_id) {
    const row = await prisma.bundleZonePrice.findUnique({
      where: { bundle_id_zone_id: { bundle_id: promo.bundle_id, zone_id: promo.zone_id } },
    });
    if (!row) badRequest("Ce pack n’a pas de prix dans la zone choisie.");
    await prisma.bundleZonePrice.update({
      where: { id: row.id },
      data: { promo_price_amount: promo.promo_price_amount, promo_is_active: live },
    });
    return;
  }
  badRequest("Une promotion vise un produit ou un pack.");
}

export async function clearPromotionFromCatalog(promo: Promotion): Promise<void> {
  if (promo.product_id) {
    const row = await prisma.productZonePrice.findUnique({
      where: { product_id_zone_id: { product_id: promo.product_id, zone_id: promo.zone_id } },
    });
    if (row) {
      await prisma.productZonePrice.update({
        where: { id: row.id },
        data: { promo_price_amount: null, promo_is_active: false },
      });
    }
    return;
  }
  if (promo.bundle_id) {
    const row = await prisma.bundleZonePrice.findUnique({
      where: { bundle_id_zone_id: { bundle_id: promo.bundle_id, zone_id: promo.zone_id } },
    });
    if (row) {
      await prisma.bundleZonePrice.update({
        where: { id: row.id },
        data: { promo_price_amount: null, promo_is_active: false },
      });
    }
  }
}

export async function deletePromotion(promotionId: string): Promise<void> {
  const row = await prisma.promotion.findUnique({ where: { id: promotionId } });
  if (!row) notFound("Promotion introuvable.");
  await clearPromotionFromCatalog(row);
  await prisma.promotion.delete({ where: { id: promotionId } });
}
