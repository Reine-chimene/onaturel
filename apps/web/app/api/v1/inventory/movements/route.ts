import { handleRouteError, jsonOk, queryString } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { assertZoneScope, requirePermission } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requirePermission(req, "inventory:read");
    const params = queryString(req);
    const zoneId = params.get("zone_id");
    const limit = Number(params.get("limit") || 100);
    if (zoneId) assertZoneScope(user, zoneId);
    const where =
      zoneId
        ? { zone_id: zoneId }
        : user.role === "SELLER" && user.assigned_zone_id
          ? { zone_id: user.assigned_zone_id }
          : {};
    const rows = await prisma.inventoryMovement.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
    });
    return jsonOk(
      rows.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        zone_id: item.zone_id,
        qty_delta: item.qty_delta,
        reason: item.reason,
        reference_type: item.reference_type,
        created_at: item.created_at.toISOString(),
      })),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
