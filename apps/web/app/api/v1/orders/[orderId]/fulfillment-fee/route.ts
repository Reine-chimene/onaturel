import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requireOwner, writeAudit } from "@/lib/auth/session";
import { orderOut, setFulfillmentFee } from "@/lib/services/orders.service";
import { notFound } from "@/lib/utils/errors";
import { fulfillmentFeeSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await requireOwner(req);
    const { orderId } = await ctx.params;
    const body = await readJson(req, fulfillmentFeeSchema);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) notFound("Commande introuvable.");
    await setFulfillmentFee(orderId, body.fulfillment_fee_amount);
    await writeAudit({ actorId: user.id, action: "order.fulfillment_fee", entityType: "order", entityId: orderId });
    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      include: { zone: true, items: true },
    });
    return jsonOk(orderOut(updated!, true));
  } catch (error) {
    return handleRouteError(error);
  }
}
