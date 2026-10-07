import { randomBytes } from "crypto";
import type { CommercialZone, Product, ProductImage, FileAsset, ZoneFulfillmentMode } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getOrCreatePosition } from "@/lib/services/inventory.service";
import { bundleBuildableQty } from "@/lib/services/pricing.service";
import { publicObjectUrl } from "@/lib/storage";
import { ApiError, badRequest, notFound } from "@/lib/utils/errors";
import { sellingPrice } from "@/lib/utils/money";
import { FeePolicy, FulfillmentMode, FulfillmentPaymentStatus, OrderStatus, ProductPaymentStatus } from "@/types/enums";

const MODE_UNAVAILABLE: Record<string, string> = {
  [FulfillmentMode.DELIVERY]: "Les livraisons sont momentanément indisponibles.",
  [FulfillmentMode.SHIPPING]: "Les expéditions sont momentanément indisponibles.",
  [FulfillmentMode.PICKUP]: "Le retrait est momentanément indisponible.",
};

type ZoneWithModes = CommercialZone & {
  currency: { code: string; id: string };
  fulfillment_modes: ZoneFulfillmentMode[];
};

export type QuoteLine = {
  kind: string;
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

function checkoutError(message: string, status = 400): never {
  throw new ApiError(status, message);
}

export function normalizePhone(value: string): string {
  let compact = [...value.trim()].filter((ch) => /\d/.test(ch) || ch === "+").join("");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  return compact;
}

export function validatePhone(value: string): string {
  const compact = normalizePhone(value || "");
  const digits = [...compact].filter((ch) => /\d/.test(ch)).join("");
  if (digits.length < 8 || digits.length > 15) {
    checkoutError("Merci d’indiquer un numéro de téléphone valide.");
  }
  return compact;
}

export function validateName(value: string): string {
  const name = (value || "").split(/\s+/).filter(Boolean).join(" ");
  if (name.length < 2) checkoutError("Merci d’indiquer votre nom et prénom.");
  return name;
}

export function fulfillmentOnCreate(row: ZoneFulfillmentMode): [number, string, boolean] {
  if (row.mode === FulfillmentMode.PICKUP) return [0, FulfillmentPaymentStatus.NOT_APPLICABLE, true];
  if (row.fee_policy === FeePolicy.NONE) return [0, FulfillmentPaymentStatus.NOT_APPLICABLE, true];
  if (row.fee_policy === FeePolicy.DEFAULT && row.default_fee_amount != null) {
    return [row.default_fee_amount, FulfillmentPaymentStatus.DUE_ON_FULFILLMENT, true];
  }
  return [0, FulfillmentPaymentStatus.DUE_ON_FULFILLMENT, false];
}

export async function loadZone(slug: string): Promise<ZoneWithModes> {
  const zone = await prisma.commercialZone.findFirst({
    where: { slug, is_active: true },
    include: { currency: true, fulfillment_modes: true },
  });
  if (!zone) checkoutError("Cette zone n’est pas disponible.", 404);
  return zone;
}

export function enabledMode(zone: ZoneWithModes, mode: string): ZoneFulfillmentMode {
  if (!Object.values(FulfillmentMode).includes(mode as FulfillmentMode)) {
    checkoutError("Mode de réception inconnu.");
  }
  const row = zone.fulfillment_modes.find((item) => item.mode === mode);
  if (!row || !row.is_enabled) {
    checkoutError(MODE_UNAVAILABLE[mode] || "Ce mode de réception n’est pas disponible.");
  }
  return row;
}

export function validateAddress(
  mode: string,
  city: string | null | undefined,
  neighborhood: string | null | undefined,
): [string | null, string | null] {
  const cityClean = (city || "").split(/\s+/).filter(Boolean).join(" ") || null;
  const neighborhoodClean = (neighborhood || "").split(/\s+/).filter(Boolean).join(" ") || null;
  if (mode === FulfillmentMode.DELIVERY) {
    if (!neighborhoodClean) checkoutError("Merci d’indiquer le quartier pour la livraison.");
    return [null, neighborhoodClean];
  }
  if (mode === FulfillmentMode.SHIPPING) {
    if (!cityClean) checkoutError("Merci d’indiquer la ville pour l’expédition.");
    return [cityClean, null];
  }
  return [null, null];
}

function productThumb(
  product: Product & { images: (ProductImage & { file: FileAsset | null })[] },
): string | null {
  if (!product.images.length) return null;
  const ordered = [...product.images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  const chosen = ordered[0];
  if (!chosen.file?.storage_key) return null;
  return publicObjectUrl(chosen.file.storage_key);
}

function failLine(kind: string, itemId: string, quantity: number, issue: string, name = "", slug = ""): QuoteLine {
  return {
    kind,
    id: itemId,
    slug,
    name,
    image_url: null,
    quantity,
    max_quantity: 0,
    list_price: 0,
    unit_price: 0,
    promo_active: false,
    line_total: 0,
    ok: false,
    issue,
  };
}

async function quoteProduct(zoneId: string, productId: string, quantity: number): Promise<QuoteLine> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: { include: { file: true } } },
  });
  if (!product || !product.is_active || product.is_archived) {
    return failLine("product", productId, quantity, "Ce produit n’est plus disponible.");
  }
  const price = await prisma.productZonePrice.findFirst({
    where: { product_id: product.id, zone_id: zoneId, is_available: true },
  });
  if (!price) {
    return failLine("product", product.id, quantity, "Ce produit n’est pas proposé dans cette zone.", product.name, product.slug);
  }
  const position = await getOrCreatePosition(product.id, zoneId);
  const maxQty = Math.max(0, position.qty);
  const promoActive = Boolean(price.promo_is_active && price.promo_price_amount != null);
  const unit = sellingPrice(price.price_amount, price.promo_price_amount, price.promo_is_active);
  const ok = maxQty > 0 && quantity <= maxQty;
  let issue: string | null = null;
  if (maxQty <= 0) issue = "Ce produit est en rupture de stock.";
  else if (quantity > maxQty) issue = `Le stock disponible est de ${maxQty}. Merci d’ajuster la quantité.`;
  return {
    kind: "product",
    id: product.id,
    slug: product.slug,
    name: product.name,
    image_url: productThumb(product),
    quantity,
    max_quantity: maxQty,
    list_price: price.price_amount,
    unit_price: unit,
    promo_active: promoActive,
    line_total: ok ? unit * quantity : 0,
    ok,
    issue,
  };
}

async function quotePack(zoneId: string, bundleId: string, quantity: number): Promise<QuoteLine> {
  const bundle = await prisma.bundle.findUnique({ where: { id: bundleId } });
  if (!bundle || !bundle.is_active || bundle.is_archived) {
    return failLine("pack", bundleId, quantity, "Ce pack n’est plus disponible.");
  }
  const price = await prisma.bundleZonePrice.findFirst({
    where: { bundle_id: bundle.id, zone_id: zoneId, is_available: true },
  });
  if (!price) {
    return failLine("pack", bundle.id, quantity, "Ce pack n’est pas proposé dans cette zone.", bundle.name, bundle.slug);
  }
  const maxQty = await bundleBuildableQty(bundle.id, zoneId);
  const promoActive = Boolean(price.promo_is_active && price.promo_price_amount != null);
  const unit = sellingPrice(price.price_amount, price.promo_price_amount, price.promo_is_active);
  const ok = maxQty > 0 && quantity <= maxQty;
  let issue: string | null = null;
  if (maxQty <= 0) issue = "Ce pack ne peut pas être constitué : un soin est en rupture.";
  else if (quantity > maxQty) issue = `Seulement ${maxQty} pack(s) peuvent être constitués. Merci d’ajuster la quantité.`;
  return {
    kind: "pack",
    id: bundle.id,
    slug: bundle.slug,
    name: bundle.name,
    image_url: null,
    quantity,
    max_quantity: maxQty,
    list_price: price.price_amount,
    unit_price: unit,
    promo_active: promoActive,
    line_total: ok ? unit * quantity : 0,
    ok,
    issue,
  };
}

export async function quoteItems(
  zone: ZoneWithModes,
  items: { product_id?: string | null; bundle_id?: string | null; quantity: number }[],
): Promise<{ lines: QuoteLine[]; productsAmount: number; canSubmit: boolean }> {
  if (!items.length) checkoutError("Votre panier est vide.");
  const lines: QuoteLine[] = [];
  let productsAmount = 0;
  let canSubmit = true;
  for (const raw of items) {
    const quantity = Number(raw.quantity || 0);
    const productId = raw.product_id;
    const bundleId = raw.bundle_id;
    if (quantity < 1) {
      canSubmit = false;
      lines.push(failLine(productId ? "product" : "pack", String(productId || bundleId || ""), quantity, "La quantité n’est pas valide."));
      continue;
    }
    if (Boolean(productId) === Boolean(bundleId)) {
      checkoutError("Chaque ligne doit concerner un produit ou un pack.");
    }
    let line: QuoteLine;
    try {
      line = productId
        ? await quoteProduct(zone.id, productId, quantity)
        : await quotePack(zone.id, String(bundleId), quantity);
    } catch {
      line = failLine(productId ? "product" : "pack", String(productId || bundleId || ""), quantity, "Cette ligne n’est plus disponible.");
    }
    if (!line.ok) canSubmit = false;
    else productsAmount += line.line_total;
    lines.push(line);
  }
  return { lines, productsAmount, canSubmit };
}

async function allocateOrderNumber(zoneSlug: string): Promise<string> {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `ON-${zoneSlug.slice(0, 2).toUpperCase()}-${day}-`;
  for (let i = 0; i < 12; i += 1) {
    const candidate = prefix + randomBytes(2).toString("hex").toUpperCase();
    const exists = await prisma.order.findUnique({ where: { number: candidate } });
    if (!exists) return candidate;
  }
  throw new ApiError(503, "Impossible d’attribuer un numéro de commande.");
}

async function upsertCustomer(name: string, phone: string, zoneId: string) {
  const existing = await prisma.customer.findUnique({ where: { phone } });
  if (!existing) {
    return prisma.customer.create({ data: { full_name: name, phone, last_zone_id: zoneId } });
  }
  return prisma.customer.update({
    where: { id: existing.id },
    data: { full_name: name, last_zone_id: zoneId },
  });
}

export async function createPublicOrder(input: {
  zoneSlug: string;
  fulfillmentMode: string;
  customerName: string;
  customerPhone: string;
  city?: string | null;
  neighborhood?: string | null;
  items: { product_id?: string | null; bundle_id?: string | null; quantity: number }[];
}) {
  const zone = await loadZone(input.zoneSlug);
  const modeRow = enabledMode(zone, input.fulfillmentMode);
  const name = validateName(input.customerName);
  const phone = validatePhone(input.customerPhone);
  const [cityClean, neighborhoodClean] = validateAddress(input.fulfillmentMode, input.city, input.neighborhood);
  const quoted = await quoteItems(zone, input.items);
  if (!quoted.canSubmit) {
    const first = quoted.lines.find((line) => line.issue)?.issue;
    checkoutError(first || "Merci de corriger votre panier avant d’envoyer la commande.");
  }
  const [feeAmount, feeStatus] = fulfillmentOnCreate(modeRow);
  const customer = await upsertCustomer(name, phone, zone.id);
  const number = await allocateOrderNumber(zone.slug);
  const order = await prisma.order.create({
    data: {
      number,
      zone_id: zone.id,
      currency_id: zone.currency_id,
      currency_code: zone.currency.code,
      status: OrderStatus.NEW,
      customer_id: customer.id,
      customer_name: name,
      customer_phone: phone,
      fulfillment_mode: input.fulfillmentMode,
      city: cityClean,
      neighborhood: neighborhoodClean,
      products_amount: quoted.productsAmount,
      fulfillment_fee_amount: feeAmount,
      products_payment_status: ProductPaymentStatus.PENDING,
      fulfillment_payment_status: feeStatus,
      items: {
        create: quoted.lines.map((line) => ({
          product_id: line.kind === "product" ? line.id : null,
          bundle_id: line.kind === "pack" ? line.id : null,
          name_snapshot: line.name,
          unit_price_snapshot: line.unit_price,
          quantity: line.quantity,
          line_total: line.line_total,
        })),
      },
    },
    include: { items: true },
  });
  return { order, zone };
}

export function modePayload(row: ZoneFulfillmentMode) {
  const [feeAmount, feeStatus, feeKnown] = fulfillmentOnCreate(row);
  return {
    mode: row.mode,
    label: row.label,
    is_enabled: row.is_enabled,
    fee_policy: row.fee_policy,
    default_fee_amount: row.default_fee_amount,
    fee_amount: feeAmount,
    fee_known: feeKnown,
    fee_payment_status: feeStatus,
  };
}

export function publicOrderOut(
  order: {
    number: string;
    status: string;
    currency_code: string;
    customer_name: string;
    customer_phone: string;
    fulfillment_mode: string;
    city: string | null;
    neighborhood: string | null;
    products_amount: number;
    fulfillment_fee_amount: number;
    products_payment_status: string;
    fulfillment_payment_status: string;
    items: { bundle_id: string | null; name_snapshot: string; quantity: number; unit_price_snapshot: number; line_total: number }[];
  },
  zone: ZoneWithModes,
) {
  const labels = Object.fromEntries(zone.fulfillment_modes.map((item) => [item.mode, item.label]));
  const feeKnown = order.fulfillment_payment_status === "NOT_APPLICABLE" || order.fulfillment_fee_amount > 0;
  return {
    number: order.number,
    status: order.status,
    zone_slug: zone.slug,
    zone_name: zone.name,
    currency_code: order.currency_code,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    fulfillment_mode: order.fulfillment_mode,
    fulfillment_label: labels[order.fulfillment_mode] || order.fulfillment_mode,
    city: order.city,
    neighborhood: order.neighborhood,
    products_amount: order.products_amount,
    fulfillment_fee_amount: order.fulfillment_fee_amount,
    fee_known: feeKnown,
    products_payment_status: order.products_payment_status,
    fulfillment_payment_status: order.fulfillment_payment_status,
    pay_now_amount: order.products_amount,
    items: order.items.map((item) => ({
      kind: item.bundle_id ? "pack" : "product",
      name: item.name_snapshot,
      quantity: item.quantity,
      unit_price: item.unit_price_snapshot,
      line_total: item.line_total,
    })),
  };
}

export { checkoutError, badRequest, notFound };
