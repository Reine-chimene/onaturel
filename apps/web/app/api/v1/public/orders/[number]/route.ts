import { handleRouteError, jsonOk } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { publicOrderOut } from "@/lib/services/checkout.service";
import { notFound } from "@/lib/utils/errors";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ number: string }> }) {
  try {
    const { number } = await ctx.params;
    const order = await prisma.order.findUnique({
      where: { number },
      include: { items: true },
    });
    if (!order) notFound("Commande introuvable.");
    const zone = await prisma.commercialZone.findUnique({
      where: { id: order.zone_id },
      include: { currency: true, fulfillment_modes: true },
    });
    if (!zone) notFound("Commande introuvable.");
    return jsonOk(publicOrderOut(order, zone));
  } catch (error) {
    return handleRouteError(error);
  }
}
