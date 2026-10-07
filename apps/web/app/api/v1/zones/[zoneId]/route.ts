import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { zoneInclude, zoneOut } from "@/lib/services/zones.service";
import { notFound } from "@/lib/utils/errors";
import { zoneUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ zoneId: string }> }) {
  try {
    const { zoneId } = await ctx.params;
    const zone = await prisma.commercialZone.findUnique({ where: { id: zoneId }, include: zoneInclude });
    if (!zone) notFound("Zone introuvable.");
    return jsonOk(zoneOut(zone));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ zoneId: string }> }) {
  try {
    const user = await requirePermission(req, "zones:write");
    const { zoneId } = await ctx.params;
    const body = await readJson(req, zoneUpdateSchema);
    const zone = await prisma.commercialZone.findUnique({ where: { id: zoneId } });
    if (!zone) notFound("Zone introuvable.");
    await prisma.commercialZone.update({
      where: { id: zoneId },
      data: {
        ...(body.is_active != null ? { is_active: body.is_active } : {}),
        ...(body.name != null ? { name: body.name } : {}),
        ...(body.sort_order != null ? { sort_order: body.sort_order } : {}),
      },
    });
    await writeAudit({
      actorId: user.id,
      action: "zone.update",
      entityType: "commercial_zone",
      entityId: zoneId,
      payload: body,
    });
    const updated = await prisma.commercialZone.findUnique({ where: { id: zoneId }, include: zoneInclude });
    return jsonOk(zoneOut(updated!));
  } catch (error) {
    return handleRouteError(error);
  }
}
