import { handleRouteError, jsonOk } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { assertZoneScope, requirePermission } from "@/lib/auth/session";
import { orderOut } from "@/lib/services/orders.service";
import { notFound } from "@/lib/utils/errors";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await requirePermission(req, "orders:read");
    const { orderId } = await ctx.params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { zone: true, items: true },
    });
    if (!order) notFound("Commande introuvable.");
    assertZoneScope(user, order.zone_id);
    return jsonOk(orderOut(order, true));
  } catch (error) {
    return handleRouteError(error);
  }
}
