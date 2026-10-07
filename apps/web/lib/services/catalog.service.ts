import { prisma } from "@/lib/db/prisma";
import { defaultLowStockThreshold, getOrCreatePosition, setZoneQty, stockStatus, totalQty } from "@/lib/services/inventory.service";
import { publicObjectUrl } from "@/lib/storage";
import { isOwnerRole } from "@/lib/auth/rbac";
import { badRequest, conflict, notFound } from "@/lib/utils/errors";
import { slugify } from "@/lib/utils/slug";
import { sellingPrice } from "@/lib/utils/money";
import type { FileAsset, Product } from "@prisma/client";

export async function uniqueProductSlug(name: string, currentId?: string): Promise<string> {
  const base = slugify(name);
  if (!base) badRequest("Le nom ne permet pas de former un identifiant.");
  let slug = base;
  let n = 2;
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.id === currentId) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

export async function uniqueCategorySlug(name: string, currentId?: string): Promise<string> {
  const base = slugify(name);
  if (!base) badRequest("Le nom ne permet pas de former un identifiant.");
  let slug = base;
  let n = 2;
  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (!existing || existing.id === currentId) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

const productInclude = {
  category: true,
  images: { include: { file: true } },
  zone_prices: { include: { zone: { include: { currency: true } } } },
} as const;

export async function loadProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: productInclude,
  });
  if (!product) notFound("Produit introuvable.");
  return product;
}

export async function upsertZonePrice(input: {
  productId: string;
  zoneId: string;
  priceAmount?: number | null;
  isAvailable?: boolean | null;
}) {
  const row = await prisma.productZonePrice.findUnique({
    where: { product_id_zone_id: { product_id: input.productId, zone_id: input.zoneId } },
  });
  if (input.priceAmount == null && !row) return null;
  if (input.priceAmount != null && input.priceAmount <= 0) badRequest("Le prix doit être supérieur à zéro.");
  if (!row) {
    if (input.priceAmount == null) return null;
    return prisma.productZonePrice.create({
      data: {
        product_id: input.productId,
        zone_id: input.zoneId,
        price_amount: input.priceAmount,
        is_available: input.isAvailable ?? true,
      },
    });
  }
  return prisma.productZonePrice.update({
    where: { id: row.id },
    data: {
      ...(input.priceAmount != null ? { price_amount: input.priceAmount } : {}),
      ...(input.isAvailable != null ? { is_available: input.isAvailable } : {}),
    },
  });
}

export function productImagesOut(
  product: Product & { images: { id: string; file_id: string; sort_order: number; is_primary: boolean; file: FileAsset | null }[] },
) {
  const images = [...product.images].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  return images.map((image) => ({
    id: image.id,
    file_id: image.file_id,
    url: image.file ? publicObjectUrl(image.file.storage_key) : null,
    sort_order: image.sort_order,
    is_primary: image.is_primary,
  }));
}

export async function productAdminOut(productId: string) {
  const product = await loadProduct(productId);
  const threshold = await defaultLowStockThreshold();
  const zones = await prisma.commercialZone.findMany({
    include: { currency: true },
    orderBy: { sort_order: "asc" },
  });
  const zoneMap = new Map(product.zone_prices.map((price) => [price.zone_id, price]));
  const positions = await prisma.inventoryPosition.findMany({ where: { product_id: product.id } });
  const positionMap = new Map(positions.map((item) => [item.zone_id, item]));
  const images = productImagesOut(product);
  let primary = images.find((img) => img.is_primary && img.url)?.url ?? null;
  if (!primary && images.length) primary = images[0].url;
  const zoneRows = zones.map((zone) => {
    const price = zoneMap.get(zone.id);
    const position = positionMap.get(zone.id);
    const qty = position?.qty ?? 0;
    const low = position?.low_stock_threshold ?? threshold;
    return {
      zone_id: zone.id,
      zone_slug: zone.slug,
      zone_name: zone.name,
      currency_code: zone.currency.code,
      price_amount: price?.price_amount ?? null,
      promo_price_amount: price?.promo_price_amount ?? null,
      promo_is_active: price?.promo_is_active ?? false,
      selling_price: price ? sellingPrice(price.price_amount, price.promo_price_amount, price.promo_is_active) : null,
      is_available: price?.is_available ?? false,
      stock: qty,
      stock_status: stockStatus(qty, low),
      low_stock_threshold: position?.low_stock_threshold ?? null,
    };
  });
  return {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category_id: product.category_id,
    category_name: product.category?.name ?? null,
    is_new: product.is_new,
    is_featured: product.is_featured,
    is_active: product.is_active,
    is_archived: product.is_archived,
    image_url: primary,
    images,
    zones: zoneRows,
  };
}

export async function attachImage(productId: string, fileAsset: FileAsset, asPrimary = false) {
  const product = await loadProduct(productId);
  const nextOrder = product.images.reduce((max, image) => Math.max(max, image.sort_order), -1) + 1;
  const makePrimary = asPrimary || product.images.length === 0;
  if (makePrimary) {
    await prisma.productImage.updateMany({ where: { product_id: productId }, data: { is_primary: false } });
  }
  return prisma.productImage.create({
    data: {
      product_id: productId,
      file_id: fileAsset.id,
      sort_order: nextOrder,
      is_primary: makePrimary,
    },
  });
}

export async function listProductsAdmin(input: {
  role: string;
  zoneId?: string | null;
  q?: string | null;
  includeArchived: boolean;
}) {
  const products = await prisma.product.findMany({
    where: {
      ...(input.includeArchived ? {} : { is_archived: false }),
      ...(input.q
        ? {
            OR: [
              { name: { contains: input.q, mode: "insensitive" } },
              { slug: { contains: input.q, mode: "insensitive" } },
              { sku: { contains: input.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: productInclude,
    orderBy: { name: "asc" },
  });
  if (isOwnerRole(input.role) && !input.zoneId) {
    return Promise.all(products.map((product) => productAdminOut(product.id)));
  }
  const threshold = await defaultLowStockThreshold();
  const result = [];
  for (const product of products) {
    let zonePrice: number | null = null;
    let zoneStock: number | null = null;
    let statusLabel: string | null = null;
    if (input.zoneId) {
      const price = await prisma.productZonePrice.findUnique({
        where: { product_id_zone_id: { product_id: product.id, zone_id: input.zoneId } },
      });
      if (price?.is_available) zonePrice = sellingPrice(price.price_amount, price.promo_price_amount, price.promo_is_active);
      const position = await prisma.inventoryPosition.findUnique({
        where: { product_id_zone_id: { product_id: product.id, zone_id: input.zoneId } },
      });
      zoneStock = position?.qty ?? 0;
      statusLabel = stockStatus(zoneStock, position?.low_stock_threshold ?? threshold);
    }
    result.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      is_active: product.is_active,
      is_new: product.is_new,
      zone_price: zonePrice,
      zone_stock: zoneStock,
      stock_status: statusLabel,
      total_stock: isOwnerRole(input.role) ? await totalQty(product.id) : null,
    });
  }
  return result;
}

export async function deleteProduct(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) notFound("Produit introuvable.");

  await prisma.$transaction(async (tx) => {
    await tx.bundleItem.deleteMany({ where: { product_id: productId } });
    await tx.inventoryMovement.deleteMany({ where: { product_id: productId } });
    await tx.product.delete({ where: { id: productId } });
  });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const row = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!row) notFound("Catégorie introuvable.");
  await prisma.category.delete({ where: { id: categoryId } });
}

export { conflict, getOrCreatePosition, setZoneQty };
