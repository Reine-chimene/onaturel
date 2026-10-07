import { prisma } from "@/lib/db/prisma";
import { defaultLowStockThreshold } from "@/lib/services/inventory.service";
import { promotionIsLive } from "@/lib/services/promotions.service";
import { CONFIRMED_STATUSES, FulfillmentPaymentStatus, OrderStatus, SaleStatus, SalesChannel } from "@/types/enums";

const REVENUE_STATUSES = [...CONFIRMED_STATUSES];

function dateWhere(dateFrom?: Date | null, dateTo?: Date | null) {
  return {
    ...(dateFrom ? { gte: dateFrom } : {}),
    ...(dateTo ? { lt: dateTo } : {}),
  };
}

export async function revenueQuery(input: {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  zoneId?: string | null;
  currencyCode?: string | null;
  channel?: SalesChannel | null;
}) {
  const buckets = new Map<string, {
    zone: string;
    currency_code: string;
    channel: string;
    products_amount: number;
    fulfillment_fees_paid: number;
    count: number;
  }>();

  if (!input.channel || input.channel === SalesChannel.ONLINE) {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: REVENUE_STATUSES },
        ...(input.dateFrom || input.dateTo ? { created_at: dateWhere(input.dateFrom, input.dateTo) } : {}),
        ...(input.zoneId ? { zone_id: input.zoneId } : {}),
        ...(input.currencyCode ? { currency_code: input.currencyCode } : {}),
      },
      include: { zone: true },
    });
    for (const order of orders) {
      const key = `${order.zone.name}|${order.currency_code}|${SalesChannel.ONLINE}`;
      const row = buckets.get(key) ?? {
        zone: order.zone.name,
        currency_code: order.currency_code,
        channel: SalesChannel.ONLINE,
        products_amount: 0,
        fulfillment_fees_paid: 0,
        count: 0,
      };
      row.products_amount += order.products_amount;
      if (order.fulfillment_payment_status === FulfillmentPaymentStatus.PAID) {
        row.fulfillment_fees_paid += order.fulfillment_fee_amount;
      }
      row.count += 1;
      buckets.set(key, row);
    }
  }

  if (!input.channel || input.channel === SalesChannel.STORE) {
    const sales = await prisma.sale.findMany({
      where: {
        status: SaleStatus.COMPLETED,
        ...(input.dateFrom || input.dateTo ? { created_at: dateWhere(input.dateFrom, input.dateTo) } : {}),
        ...(input.zoneId ? { zone_id: input.zoneId } : {}),
        ...(input.currencyCode ? { currency_code: input.currencyCode } : {}),
      },
      include: { zone: true },
    });
    for (const sale of sales) {
      const key = `${sale.zone.name}|${sale.currency_code}|${SalesChannel.STORE}`;
      const row = buckets.get(key) ?? {
        zone: sale.zone.name,
        currency_code: sale.currency_code,
        channel: SalesChannel.STORE,
        products_amount: 0,
        fulfillment_fees_paid: 0,
        count: 0,
      };
      row.products_amount += sale.products_amount;
      row.fulfillment_fees_paid += sale.fulfillment_fee_amount;
      row.count += 1;
      buckets.set(key, row);
    }
  }

  return [...buckets.values()].sort((a, b) =>
    a.currency_code.localeCompare(b.currency_code) || a.zone.localeCompare(b.zone) || a.channel.localeCompare(b.channel),
  );
}

export async function orderStatusCounts(dateFrom?: Date | null, dateTo?: Date | null) {
  const grouped = await prisma.order.groupBy({
    by: ["status"],
    where: {
      ...(dateFrom || dateTo ? { created_at: dateWhere(dateFrom, dateTo) } : {}),
    },
    _count: { id: true },
  });
  const found = Object.fromEntries(grouped.map((row) => [row.status, row._count.id]));
  return Object.fromEntries(Object.values(OrderStatus).map((status) => [status, found[status] ?? 0]));
}

export async function itemsSoldCount(dateFrom?: Date | null, dateTo?: Date | null, zoneId?: string | null) {
  const result = await prisma.orderItem.aggregate({
    _sum: { quantity: true },
    where: {
      order: {
        status: { in: REVENUE_STATUSES },
        ...(dateFrom || dateTo ? { created_at: dateWhere(dateFrom, dateTo) } : {}),
        ...(zoneId ? { zone_id: zoneId } : {}),
      },
    },
  });
  return result._sum.quantity ?? 0;
}

export async function outOfStockCount() {
  return prisma.inventoryPosition.count({ where: { qty: { lte: 0 } } });
}

export async function lowStockCount() {
  const threshold = await defaultLowStockThreshold();
  const rows = await prisma.inventoryPosition.findMany();
  return rows.filter((row) => row.qty > 0 && row.qty <= (row.low_stock_threshold ?? threshold)).length;
}

export async function ordersCreatedCount(dateFrom?: Date | null, dateTo?: Date | null) {
  return prisma.order.count({
    where: {
      ...(dateFrom || dateTo ? { created_at: dateWhere(dateFrom, dateTo) } : {}),
    },
  });
}

export async function salesLines(input: { dateFrom?: Date | null; dateTo?: Date | null; zoneId?: string | null; limit?: number }) {
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        status: { in: REVENUE_STATUSES },
        ...(input.dateFrom || input.dateTo ? { created_at: dateWhere(input.dateFrom, input.dateTo) } : {}),
        ...(input.zoneId ? { zone_id: input.zoneId } : {}),
      },
    },
    include: { order: { include: { zone: true } } },
    orderBy: { order: { created_at: "desc" } },
    take: input.limit ?? 200,
  });
  return items.map((item) => ({
    order_number: item.order.number,
    created_at: item.order.created_at.toISOString(),
    zone: item.order.zone.name,
    currency_code: item.order.currency_code,
    name: item.name_snapshot,
    quantity: item.quantity,
    unit_price: item.unit_price_snapshot,
    amount: item.line_total,
  }));
}

export async function activePromotionsCount() {
  const rows = await prisma.promotion.findMany({ where: { is_active: true } });
  return rows.filter((row) => promotionIsLive(row)).length;
}

export async function topProducts(input: {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  zoneId?: string | null;
  limit?: number;
}) {
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        status: { in: REVENUE_STATUSES },
        ...(input.dateFrom || input.dateTo ? { created_at: dateWhere(input.dateFrom, input.dateTo) } : {}),
        ...(input.zoneId ? { zone_id: input.zoneId } : {}),
      },
    },
    include: { order: { include: { zone: true } } },
  });
  const buckets = new Map<string, {
    zone: string;
    currency_code: string;
    product_id: string | null;
    name: string;
    quantity: number;
    amount: number;
  }>();
  for (const item of items) {
    const key = `${item.order.zone.name}|${item.order.currency_code}|${item.product_id}|${item.name_snapshot}`;
    const row = buckets.get(key) ?? {
      zone: item.order.zone.name,
      currency_code: item.order.currency_code,
      product_id: item.product_id,
      name: item.name_snapshot,
      quantity: 0,
      amount: 0,
    };
    row.quantity += item.quantity;
    row.amount += item.line_total;
    buckets.set(key, row);
  }
  return [...buckets.values()].sort((a, b) => b.quantity - a.quantity).slice(0, input.limit ?? 10);
}

export async function revenueSeries(input: {
  granularity: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  zoneId?: string | null;
}) {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: REVENUE_STATUSES },
      ...(input.dateFrom || input.dateTo ? { created_at: dateWhere(input.dateFrom, input.dateTo) } : {}),
      ...(input.zoneId ? { zone_id: input.zoneId } : {}),
    },
    include: { zone: true },
    orderBy: { created_at: "asc" },
  });
  const buckets = new Map<string, { zone: string; currency_code: string; points: Map<string, { period: string; products_amount: number; fulfillment_fees_paid: number; orders: number }> }>();
  for (const order of orders) {
    const iso = order.created_at.toISOString();
    const period = input.granularity === "month" ? iso.slice(0, 7) : iso.slice(0, 10);
    const key = `${order.zone.name}|${order.currency_code}`;
    const series = buckets.get(key) ?? {
      zone: order.zone.name,
      currency_code: order.currency_code,
      points: new Map(),
    };
    const point = series.points.get(period) ?? {
      period,
      products_amount: 0,
      fulfillment_fees_paid: 0,
      orders: 0,
    };
    point.products_amount += order.products_amount;
    if (order.fulfillment_payment_status === FulfillmentPaymentStatus.PAID) {
      point.fulfillment_fees_paid += order.fulfillment_fee_amount;
    }
    point.orders += 1;
    series.points.set(period, point);
    buckets.set(key, series);
  }
  return [...buckets.values()].map((row) => ({
    zone: row.zone,
    currency_code: row.currency_code,
    points: [...row.points.values()],
  }));
}

export async function dashboardOverview(dateFrom?: Date | null, dateTo?: Date | null) {
  const counts = await orderStatusCounts(dateFrom, dateTo);
  const revenue = await revenueQuery({ dateFrom, dateTo });
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const recent = await prisma.order.findMany({
    where: {
      ...(dateFrom || dateTo ? { created_at: dateWhere(dateFrom, dateTo) } : {}),
    },
    include: { zone: true, items: true },
    orderBy: { created_at: "desc" },
    take: 8,
  });
  const toProcess =
    (counts.NEW ?? 0) + (counts.CONFIRMED ?? 0) + (counts.PREPARING ?? 0) + (counts.READY ?? 0);
  return {
    greeting: "Bonjour, O’Naturelle",
    period: {
      from: dateFrom?.toISOString() ?? null,
      to: dateTo?.toISOString() ?? null,
    },
    orders: {
      today: await ordersCreatedCount(todayStart),
      new: counts.NEW ?? 0,
      to_process: toProcess,
      confirmed: counts.CONFIRMED ?? 0,
      cancelled: counts.CANCELLED ?? 0,
      by_status: counts,
    },
    products_sold: await itemsSoldCount(dateFrom, dateTo),
    out_of_stock: await outOfStockCount(),
    low_stock: await lowStockCount(),
    active_promotions: await activePromotionsCount(),
    revenue,
    recent_orders: recent.map((order) => ({
      id: order.id,
      number: order.number,
      created_at: order.created_at.toISOString(),
      zone_name: order.zone?.name ?? null,
      currency_code: order.currency_code,
      products_amount: order.products_amount,
      status: order.status,
      items_summary: order.items.map((item) => `${item.name_snapshot} × ${item.quantity}`).join(", "),
    })),
    top_products: await topProducts({ dateFrom, dateTo, limit: 5 }),
  };
}
