import { prisma } from "@/lib/db/prisma";
import { badRequest, conflict } from "@/lib/utils/errors";
import { MovementReason, StockStatus } from "@/types/enums";

export async function defaultLowStockThreshold(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: "default_low_stock_threshold" } });
  if (!row || typeof row.value !== "object" || row.value === null) return 5;
  const value = (row.value as { value?: unknown }).value;
  return typeof value === "number" ? value : 5;
}

export function stockStatus(qty: number, threshold: number): StockStatus {
  if (qty <= 0) return StockStatus.OUT_OF_STOCK;
  if (qty <= threshold) return StockStatus.LOW_STOCK;
  return StockStatus.IN_STOCK;
}

export async function getOrCreatePosition(productId: string, zoneId: string) {
  const existing = await prisma.inventoryPosition.findUnique({
    where: { product_id_zone_id: { product_id: productId, zone_id: zoneId } },
  });
  if (existing) return existing;
  return prisma.inventoryPosition.create({
    data: { product_id: productId, zone_id: zoneId, qty: 0 },
  });
}

export async function applyMovement(input: {
  productId: string;
  zoneId: string;
  qtyDelta: number;
  reason: MovementReason;
  actorId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  transferGroupId?: string | null;
  note?: string | null;
}) {
  const position = await getOrCreatePosition(input.productId, input.zoneId);
  const nextQty = position.qty + input.qtyDelta;
  if (nextQty < 0) conflict("Stock insuffisant dans cette zone.");
  const updated = await prisma.inventoryPosition.update({
    where: { id: position.id },
    data: { qty: nextQty, updated_at: new Date() },
  });
  await prisma.inventoryMovement.create({
    data: {
      product_id: input.productId,
      zone_id: input.zoneId,
      qty_delta: input.qtyDelta,
      reason: input.reason,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
      transfer_group_id: input.transferGroupId ?? null,
      note: input.note ?? null,
      created_by_id: input.actorId ?? null,
    },
  });
  return updated;
}

export async function transferBetweenZones(input: {
  productId: string;
  fromZoneId: string;
  toZoneId: string;
  quantity: number;
  actorId?: string | null;
  note?: string | null;
}) {
  if (input.fromZoneId === input.toZoneId) badRequest("Zones source et cible identiques.");
  if (input.quantity <= 0) badRequest("Quantité de transfert invalide.");
  const groupId = crypto.randomUUID();
  await applyMovement({
    productId: input.productId,
    zoneId: input.fromZoneId,
    qtyDelta: -input.quantity,
    reason: MovementReason.TRANSFER_OUT,
    actorId: input.actorId,
    transferGroupId: groupId,
    note: input.note,
    referenceType: "transfer",
    referenceId: groupId,
  });
  await applyMovement({
    productId: input.productId,
    zoneId: input.toZoneId,
    qtyDelta: input.quantity,
    reason: MovementReason.TRANSFER_IN,
    actorId: input.actorId,
    transferGroupId: groupId,
    note: input.note,
    referenceType: "transfer",
    referenceId: groupId,
  });
  return groupId;
}

export async function totalQty(productId: string): Promise<number> {
  const positions = await prisma.inventoryPosition.findMany({ where: { product_id: productId } });
  return positions.reduce((sum, item) => sum + item.qty, 0);
}

export async function setZoneQty(input: {
  productId: string;
  zoneId: string;
  qty: number;
  actorId: string;
  note?: string | null;
}) {
  if (input.qty < 0) badRequest("Le stock ne peut pas être négatif.");
  const position = await getOrCreatePosition(input.productId, input.zoneId);
  const delta = input.qty - position.qty;
  if (delta === 0) return position;
  return applyMovement({
    productId: input.productId,
    zoneId: input.zoneId,
    qtyDelta: delta,
    reason: delta < 0 ? MovementReason.ADJUSTMENT : MovementReason.RECEIPT,
    actorId: input.actorId,
    note: input.note || "Ajustement propriétaire",
  });
}
