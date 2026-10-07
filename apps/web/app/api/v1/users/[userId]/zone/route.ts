import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { meOut } from "@/lib/services/auth.service";
import { badRequest, notFound } from "@/lib/utils/errors";
import { assignZoneSchema } from "@/lib/validations";
import { UserRole } from "@/types/enums";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  try {
    const actor = await requirePermission(req, "users:write");
    const { userId } = await ctx.params;
    const body = await readJson(req, assignZoneSchema);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) notFound("Utilisateur introuvable.");
    if (user.role !== UserRole.SELLER) badRequest("Seule une vendeuse est rattachée à une zone.");
    const zone = await prisma.commercialZone.findUnique({ where: { id: body.assigned_zone_id } });
    if (!zone) notFound("Zone introuvable.");
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { assigned_zone_id: body.assigned_zone_id },
    });
    await writeAudit({
      actorId: actor.id,
      action: "user.assign_zone",
      entityType: "user",
      entityId: updated.id,
      payload: { assigned_zone_id: body.assigned_zone_id },
    });
    return jsonOk(meOut(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}
