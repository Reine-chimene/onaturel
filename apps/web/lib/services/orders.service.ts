import type { Order, OrderItem } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { applyMovement } from "@/lib/services/inventory.service";
import { badRequest, conflict } from "@/lib/utils/errors";
import { CONFIRMED_STATUSES, FulfillmentPaymentStatus, MovementReason, OrderStatus, ProductPaymentStatus } from "@/types/enums";

export const ALLOWED_TRANSITIONS: Record<OrderStatus, ReadonlySet<OrderStatus>> = {
  [OrderStatus.NEW]: new Set([OrderStatus.CONFIRMED, OrderStatus.CANCELLED]),
  [OrderStatus.CONFIRMED]: new Set([OrderStatus.PREPARING, OrderStatus.CANCELLED]),
  [OrderStatus.PREPARING]: new Set([OrderStatus.READY, OrderStatus.CANCELLED]),
  [OrderStatus.READY]: new Set([OrderStatus.DELIVERED, OrderStatus.CANCELLED]),
  [OrderStatus.DELIVERED]: new Set(),
  [OrderStatus.CANCELLED]: new Set(),
};

export function orderCountsInRevenue(status: string): boolean {
  return CONFIRMED_STATUSES.has(status as OrderStatus);
}

async function applyLine(
  order: Order,
  item: OrderItem,
  sign: number,
  reason: MovementReason,
  actorId: string | null,
) {
  if (item.product_id) {
    await applyMovement({
      productId: item.product_id,
      zoneId: order.zone_id,
      qtyDelta: sign * item.quantity,
      reason,
      actorId,
      referenceType: "order",
      referenceId: order.id,
    });
    return;
  }
  if (item.bundle_id) {
    const components = await prisma.bundleItem.findMany({ where: { bundle_id: item.bundle_id } });
    for (const component of components) {
      await applyMovement({
        productId: component.product_id,
        zoneId: order.zone_id,
        qtyDelta: sign * component.quantity * item.quantity,
        reason,
        actorId,
        referenceType: "order",
        referenceId: order.id,
      });
    }
  }
}

export async function confirmOrderStock(orderId: string, actorId: string | null) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;
  if (order.stock_decremented_at) {
    await prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.CONFIRMED } });
    return;
  }
  for (const item of order.items) {
    await applyLine(order, item, -1, MovementReason.ORDER_CONFIRMED, actorId);
  }
  await prisma.order.update({
    where: { id: order.id },
    data: { stock_decremented_at: new Date(), status: OrderStatus.CONFIRMED },
  });
}

export async function cancelOrderStock(orderId: string, actorId: string | null) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;
  if (order.status === OrderStatus.CANCELLED) conflict("Commande déjà annulée.");
  if (order.stock_decremented_at) {
    for (const item of order.items) {
      await applyLine(order, item, 1, MovementReason.ORDER_CANCELLED, actorId);
    }
  }
  await prisma.order.update({
    where: { id: order.id },
    data: { stock_decremented_at: null, status: OrderStatus.CANCELLED },
  });
}

export async function transitionOrder(orderId: string, target: OrderStatus, actorId: string | null) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const current = order.status as OrderStatus;
  if (!ALLOWED_TRANSITIONS[current]?.has(target)) {
    conflict(`Transition ${current} → ${target} non autorisée.`);
  }
  if (target === OrderStatus.CONFIRMED) {
    await confirmOrderStock(orderId, actorId);
    return;
  }
  if (target === OrderStatus.CANCELLED) {
    await cancelOrderStock(orderId, actorId);
    return;
  }
  await prisma.order.update({ where: { id: orderId }, data: { status: target } });
}

export async function setProductsPayment(orderId: string, value: ProductPaymentStatus) {
  await prisma.order.update({ where: { id: orderId }, data: { products_payment_status: value } });
}

export async function setFulfillmentPayment(orderId: string, value: FulfillmentPaymentStatus) {
  await prisma.order.update({ where: { id: orderId }, data: { fulfillment_payment_status: value } });
}

export async function setFulfillmentFee(orderId: string, amount: number) {
  if (amount < 0) badRequest("Les frais ne peuvent pas être négatifs.");
  await prisma.order.update({ where: { id: orderId }, data: { fulfillment_fee_amount: amount } });
}

export function orderOut(
  order: Order & {
    zone?: { name: string; slug: string } | null;
    items: { id: string; product_id: string | null; bundle_id: string | null; name_snapshot: string; quantity: number; unit_price_snapshot: number; line_total: number }[];
  },
  detail = false,
) {
  const payload: Record<string, unknown> = {
    id: order.id,
    number: order.number,
    created_at: order.created_at.toISOString(),
    zone_id: order.zone_id,
    zone_name: order.zone?.name ?? null,
    zone_slug: order.zone?.slug ?? null,
    currency_code: order.currency_code,
    status: order.status,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    city: order.city,
    neighborhood: order.neighborhood,
    fulfillment_mode: order.fulfillment_mode,
    products_amount: order.products_amount,
    fulfillment_fee_amount: order.fulfillment_fee_amount,
    products_payment_status: order.products_payment_status,
    fulfillment_payment_status: order.fulfillment_payment_status,
    notes: order.notes,
    items_summary: order.items.map((item) => `${item.name_snapshot} × ${item.quantity}`).join(", "),
    items_count: order.items.reduce((sum, item) => sum + item.quantity, 0),
  };
  if (detail) {
    payload.items = order.items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      bundle_id: item.bundle_id,
      name: item.name_snapshot,
      quantity: item.quantity,
      unit_price: item.unit_price_snapshot,
      line_total: item.line_total,
    }));
    payload.stock_decremented = order.stock_decremented_at != null;
    payload.total_due = order.products_amount + order.fulfillment_fee_amount;
  }
  return payload;
}
