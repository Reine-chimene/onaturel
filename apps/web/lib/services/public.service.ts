import { prisma } from "@/lib/db/prisma";
import { defaultLowStockThreshold, stockStatus } from "@/lib/services/inventory.service";
import { bundleBuildableQty } from "@/lib/services/pricing.service";
import { publicObjectUrl } from "@/lib/storage";
import { notFound } from "@/lib/utils/errors";
import { sellingPrice } from "@/lib/utils/money";
import type { Product, ProductImage, FileAsset, Category, ProductZonePrice } from "@prisma/client";

type ProductWithMedia = Product & {
  category: Category | null;
  images: (ProductImage & { file: FileAsset | null })[];
};

function productImageUrls(product: ProductWithMedia): string[] {
  const ordered = [...product.images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );
  return ordered
    .filter((image) => image.file?.storage_key)
    .map((image) => publicObjectUrl(image.file!.storage_key));
}

async function categoryScopeIds(slug: string): Promise<string[] | null> {
  const row = await prisma.category.findUnique({ where: { slug } });
  if (!row) return null;
  const children = await prisma.category.findMany({ where: { parent_id: row.id }, select: { id: true } });
  return [row.id, ...children.map((item) => item.id)];
}

async function zoneStock(productId: string, zoneId: string, threshold: number) {
  const position = await prisma.inventoryPosition.findUnique({
    where: { product_id_zone_id: { product_id: productId, zone_id: zoneId } },
  });
  const qty = position?.qty ?? 0;
  const low = position?.low_stock_threshold ?? threshold;
  return { qty, status: stockStatus(qty, low) };
}

function asPublicProduct(
  product: ProductWithMedia,
  price: ProductZonePrice,
  qty: number,
  stock: string,
  currency: string,
) {
  const images = productImageUrls(product);
  const promoActive = Boolean(price.promo_is_active && price.promo_price_amount != null);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    is_new: product.is_new,
    is_featured: product.is_featured,
    price: price.price_amount,
    promo_price: promoActive ? price.promo_price_amount : null,
    promo_active: promoActive,
    currency_code: currency,
    stock_status: stock,
    available: qty > 0,
    category_slug: product.category?.slug ?? null,
    category_name: product.category?.name ?? null,
    image_url: images[0] ?? null,
  };
}

export async function publicShop(zoneSlug: string, category?: string | null) {
  const zone = await prisma.commercialZone.findFirst({
    where: { slug: zoneSlug, is_active: true },
    include: { currency: true },
  });
  if (!zone) notFound("Zone indisponible.");
  const threshold = await defaultLowStockThreshold();
  const currency = zone.currency.code;
  const categories = await prisma.category.findMany({
    where: { is_visible: true },
    include: { image: true },
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
  });
  const categoryFilter = category ? await categoryScopeIds(category) : undefined;
  const catalog =
    category && categoryFilter === null
      ? []
      : await prisma.product.findMany({
          where: {
            is_active: true,
            is_archived: false,
            ...(categoryFilter ? { category_id: { in: categoryFilter } } : {}),
          },
          include: { category: true, images: { include: { file: true } } },
        });

  const productsOut = [];
  for (const product of catalog) {
    const price = await prisma.productZonePrice.findFirst({
      where: { product_id: product.id, zone_id: zone.id, is_available: true },
    });
    if (!price) continue;
    const { qty, status } = await zoneStock(product.id, zone.id, threshold);
    const promoActive = Boolean(price.promo_is_active && price.promo_price_amount != null);
    const images = productImageUrls(product);
    productsOut.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      is_new: product.is_new,
      is_featured: product.is_featured,
      price: price.price_amount,
      promo_price: promoActive ? price.promo_price_amount : null,
      promo_active: promoActive,
      currency_code: currency,
      stock_status: status,
      available: qty > 0,
      category_slug: product.category?.slug ?? null,
      category_name: product.category?.name ?? null,
      image_url: images[0] ?? null,
    });
  }

  const packsOut = [];
  if (!category) {
    const packPrices = await prisma.bundleZonePrice.findMany({
      where: { zone_id: zone.id, is_available: true },
    });
    for (const packPrice of packPrices) {
      const bundle = await prisma.bundle.findUnique({
        where: { id: packPrice.bundle_id },
        include: { image: true },
      });
      if (!bundle || !bundle.is_active || bundle.is_archived) continue;
      const promoActive = Boolean(packPrice.promo_is_active && packPrice.promo_price_amount != null);
      const qty = await bundleBuildableQty(bundle.id, zone.id);
      packsOut.push({
        id: bundle.id,
        slug: bundle.slug,
        name: bundle.name,
        description: bundle.description,
        price: packPrice.price_amount,
        promo_price: promoActive ? packPrice.promo_price_amount : null,
        promo_active: promoActive,
        currency_code: currency,
        available: qty > 0,
        available_qty: qty,
        image_url: bundle.image?.storage_key ? publicObjectUrl(bundle.image.storage_key) : null,
      });
    }
  }

  return {
    zone_slug: zone.slug,
    zone_name: zone.name,
    currency_code: currency,
    categories: categories.map((item) => ({
      slug: item.slug,
      name: item.name,
      description: item.description,
      image_url: item.image?.storage_key ? publicObjectUrl(item.image.storage_key) : null,
    })),
    products: productsOut,
    packs: packsOut,
  };
}

export async function publicProduct(slug: string, zoneSlug: string) {
  const zone = await prisma.commercialZone.findFirst({
    where: { slug: zoneSlug, is_active: true },
    include: { currency: true },
  });
  if (!zone) notFound("Zone indisponible.");
  const threshold = await defaultLowStockThreshold();
  const currency = zone.currency.code;
  const product = await prisma.product.findFirst({
    where: { slug, is_active: true, is_archived: false },
    include: { category: true, images: { include: { file: true } } },
  });
  if (!product) notFound("Produit introuvable.");
  const price = await prisma.productZonePrice.findFirst({
    where: { product_id: product.id, zone_id: zone.id, is_available: true },
  });
  const { qty, status } = await zoneStock(product.id, zone.id, threshold);
  const offered = price != null;
  const promoActive = Boolean(offered && price!.promo_is_active && price!.promo_price_amount != null);
  const description = product.description?.trim() || null;
  const relatedOut = [];
  const seen = new Set([product.id]);
  if (product.category_id) {
    const others = await prisma.product.findMany({
      where: {
        is_active: true,
        is_archived: false,
        id: { not: product.id },
        category_id: product.category_id,
        zone_prices: { some: { zone_id: zone.id, is_available: true } },
      },
      include: { category: true, images: { include: { file: true } } },
      orderBy: [{ is_featured: "desc" }, { name: "asc" }],
      take: 8,
    });
    for (const other of others) {
      if (seen.has(other.id) || relatedOut.length >= 4) continue;
      const otherPrice = await prisma.productZonePrice.findFirst({
        where: { product_id: other.id, zone_id: zone.id, is_available: true },
      });
      if (!otherPrice) continue;
      const otherStock = await zoneStock(other.id, zone.id, threshold);
      seen.add(other.id);
      relatedOut.push(asPublicProduct(other, otherPrice, otherStock.qty, otherStock.status, currency));
    }
  }
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description,
    is_new: product.is_new,
    category_slug: product.category?.slug ?? null,
    category_name: product.category?.name ?? null,
    images: productImageUrls(product),
    offered,
    available: offered && qty > 0,
    qty: offered ? qty : 0,
    stock_status: offered ? status : "OUT_OF_STOCK",
    price: offered ? price!.price_amount : null,
    promo_price: promoActive ? price!.promo_price_amount : null,
    promo_active: promoActive,
    currency_code: currency,
    related: relatedOut,
  };
}

export { sellingPrice };
