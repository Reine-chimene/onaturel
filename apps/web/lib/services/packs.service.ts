import { prisma } from "@/lib/db/prisma";
import { bundleBuildableQty } from "@/lib/services/pricing.service";
import { publicObjectUrl } from "@/lib/storage";
import { sellingPrice } from "@/lib/utils/money";
import { badRequest, conflict, notFound } from "@/lib/utils/errors";
import { slugify } from "@/lib/utils/slug";

export async function packOut(bundleId: string) {
  const bundle = await prisma.bundle.findUnique({
    where: { id: bundleId },
    include: { items: { include: { product: true } }, zone_prices: true },
  });
  if (!bundle) notFound("Pack introuvable.");
  let imageUrl: string | null = null;
  if (bundle.image_file_id) {
    const file = await prisma.fileAsset.findUnique({ where: { id: bundle.image_file_id } });
    if (file?.storage_key) imageUrl = publicObjectUrl(file.storage_key);
  }
  const zones = await prisma.commercialZone.findMany({
    include: { currency: true },
    orderBy: { sort_order: "asc" },
  });
  const priceMap = new Map(bundle.zone_prices.map((row) => [row.zone_id, row]));
  const zoneRows = [];
  for (const zone of zones) {
    const price = priceMap.get(zone.id);
    const qty = await bundleBuildableQty(bundle.id, zone.id);
    zoneRows.push({
      zone_id: zone.id,
      zone_slug: zone.slug,
      zone_name: zone.name,
      currency_code: zone.currency.code,
      price_amount: price?.price_amount ?? null,
      promo_price_amount: price?.promo_price_amount ?? null,
      promo_is_active: price?.promo_is_active ?? false,
      selling_price: price ? sellingPrice(price.price_amount, price.promo_price_amount, price.promo_is_active) : null,
      is_available: price?.is_available ?? false,
      buildable_qty: qty,
      available: qty > 0 && Boolean(price?.is_available),
    });
  }
  return {
    id: bundle.id,
    slug: bundle.slug,
    name: bundle.name,
    description: bundle.description,
    image_file_id: bundle.image_file_id,
    image_url: imageUrl,
    is_active: bundle.is_active,
    is_archived: bundle.is_archived,
    items: bundle.items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product?.name ?? null,
      quantity: item.quantity,
    })),
    zones: zoneRows,
  };
}

export async function replaceItems(bundleId: string, items: { product_id: string; quantity: number }[]) {
  await prisma.bundleItem.deleteMany({ where: { bundle_id: bundleId } });
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.product_id)) continue;
    const product = await prisma.product.findUnique({ where: { id: item.product_id } });
    if (!product || product.is_archived) badRequest("Produit de pack introuvable.");
    seen.add(item.product_id);
    await prisma.bundleItem.create({
      data: { bundle_id: bundleId, product_id: item.product_id, quantity: item.quantity },
    });
  }
}

export async function upsertPackPrices(
  bundleId: string,
  prices: { zone_id: string; price_amount?: number | null; is_available?: boolean | null }[],
) {
  for (const price of prices) {
    if (price.price_amount != null && price.price_amount <= 0) {
      badRequest("Le prix du pack doit être supérieur à zéro.");
    }
    const row = await prisma.bundleZonePrice.findUnique({
      where: { bundle_id_zone_id: { bundle_id: bundleId, zone_id: price.zone_id } },
    });
    if (!row) {
      if (price.price_amount == null) continue;
      await prisma.bundleZonePrice.create({
        data: {
          bundle_id: bundleId,
          zone_id: price.zone_id,
          price_amount: price.price_amount,
          is_available: price.is_available ?? true,
        },
      });
      continue;
    }
    await prisma.bundleZonePrice.update({
      where: { id: row.id },
      data: {
        ...(price.price_amount != null ? { price_amount: price.price_amount } : {}),
        ...(price.is_available != null ? { is_available: price.is_available } : {}),
      },
    });
  }
}

export async function deletePack(bundleId: string): Promise<void> {
  const bundle = await prisma.bundle.findUnique({ where: { id: bundleId } });
  if (!bundle) notFound("Pack introuvable.");
  await prisma.$transaction(async (tx) => {
    const promos = await tx.promotion.findMany({ where: { bundle_id: bundleId } });
    for (const promo of promos) {
      const row = await tx.bundleZonePrice.findUnique({
        where: { bundle_id_zone_id: { bundle_id: bundleId, zone_id: promo.zone_id } },
      });
      if (row) {
        await tx.bundleZonePrice.update({
          where: { id: row.id },
          data: { promo_price_amount: null, promo_is_active: false },
        });
      }
    }
    await tx.promotion.deleteMany({ where: { bundle_id: bundleId } });
    await tx.bundleItem.deleteMany({ where: { bundle_id: bundleId } });
    await tx.bundleZonePrice.deleteMany({ where: { bundle_id: bundleId } });
    await tx.bundle.delete({ where: { id: bundleId } });
  });
}

export async function createPackSlug(name: string, explicit?: string | null) {
  const slug = explicit || slugify(name);
  if (!slug) badRequest("Nom de pack invalide.");
  if (await prisma.bundle.findUnique({ where: { slug } })) conflict("Ce pack existe déjà.");
  return slug;
}
