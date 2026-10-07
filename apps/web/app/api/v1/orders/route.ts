import { handleRouteError, jsonOk, queryString } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { assertZoneScope, requirePermission } from "@/lib/auth/session";
import { isOwnerRole } from "@/lib/auth/rbac";
import { orderOut } from "@/lib/services/orders.service";
import { forbidden } from "@/lib/utils/errors";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requirePermission(req, "orders:read");
    const params = queryString(req);
    const zoneId = params.get("zone_id");
    const where: Prisma.OrderWhereInput = {};
    if (!isOwnerRole(user.role)) {
      if (!user.assigned_zone_id) forbidden("Zone assignée requise.");
      where.zone_id = user.assigned_zone_id;
    } else if (zoneId) {
      assertZoneScope(user, zoneId);
      where.zone_id = zoneId;
    }
    if (params.get("status")) where.status = params.get("status")!;
    if (params.get("fulfillment_mode")) where.fulfillment_mode = params.get("fulfillment_mode")!;
    if (params.get("products_payment")) where.products_payment_status = params.get("products_payment")!;
    if (params.get("fulfillment_payment")) where.fulfillment_payment_status = params.get("fulfillment_payment")!;
    const q = params.get("q")?.trim();
    if (q) {
      const digits = q.replace(/\D/g, "");
      const phoneClauses = [{ customer_phone: { contains: q, mode: "insensitive" as const } }];
      if (digits.length >= 6) {
        phoneClauses.push({ customer_phone: { contains: digits, mode: "insensitive" as const } });
        if (digits.startsWith("237") && digits.length > 3) {
          phoneClauses.push({ customer_phone: { contains: digits.slice(3), mode: "insensitive" as const } });
        }
      }
      where.OR = [
        { number: { contains: q, mode: "insensitive" } },
        { customer_name: { contains: q, mode: "insensitive" } },
        ...phoneClauses,
      ];
    }
    const rows = await prisma.order.findMany({
      where,
      include: { zone: true, items: true },
      orderBy: { created_at: "desc" },
    });
    return jsonOk(rows.map((row) => orderOut(row)));
  } catch (error) {
    return handleRouteError(error);
  }
}
