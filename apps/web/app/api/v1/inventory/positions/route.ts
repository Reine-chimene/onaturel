import { handleRouteError, jsonOk, queryString } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { assertZoneScope, requirePermission } from "@/lib/auth/session";
import { defaultLowStockThreshold, stockStatus, totalQty } from "@/lib/services/inventory.service";
import { isOwnerRole } from "@/lib/auth/rbac";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requirePermission(req, "inventory:read");
    const zoneId = queryString(req).get("zone_id");
    if (zoneId) assertZoneScope(user, zoneId);
    const where =
      zoneId
        ? { zone_id: zoneId }
        : user.role === "SELLER" && user.assigned_zone_id
          ? { zone_id: user.assigned_zone_id }
          : {};
    const rows = await prisma.inventoryPosition.findMany({ where });
    const threshold = await defaultLowStockThreshold();
    const showTotal = isOwnerRole(user.role);
    return jsonOk(
      await Promise.all(
        rows.map(async (item) => ({
          id: item.id,
          product_id: item.product_id,
          zone_id: item.zone_id,
          qty: item.qty,
          total_qty: showTotal ? await totalQty(item.product_id) : null,
          stock_status: stockStatus(item.qty, item.low_stock_threshold ?? threshold),
        })),
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
