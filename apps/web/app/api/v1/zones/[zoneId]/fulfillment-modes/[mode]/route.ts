import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { notFound } from "@/lib/utils/errors";
import { fulfillmentUpdateSchema } from "@/lib/validations";
import { FulfillmentMode } from "@/types/enums";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ zoneId: string; mode: string }> }) {
  try {
    const user = await requirePermission(req, "zones:write");
    const { zoneId, mode } = await ctx.params;
    if (!Object.values(FulfillmentMode).includes(mode as FulfillmentMode)) {
      notFound("Mode de réception introuvable.");
    }
    const body = await readJson(req, fulfillmentUpdateSchema);
    const row = await prisma.zoneFulfillmentMode.findFirst({
      where: { zone_id: zoneId, mode },
    });
    if (!row) notFound("Mode de réception introuvable.");
    const updated = await prisma.zoneFulfillmentMode.update({
      where: { id: row.id },
      data: {
        ...(body.is_enabled != null ? { is_enabled: body.is_enabled } : {}),
        ...(body.label != null ? { label: body.label } : {}),
        ...(body.fee_policy != null ? { fee_policy: body.fee_policy } : {}),
        ...(body.default_fee_amount !== undefined ? { default_fee_amount: body.default_fee_amount } : {}),
      },
    });
    await writeAudit({
      actorId: user.id,
      action: "zone.fulfillment.update",
      entityType: "zone_fulfillment_mode",
      entityId: updated.id,
      payload: { mode, ...body },
    });
    return jsonOk({
      id: updated.id,
      mode: updated.mode,
      label: updated.label,
      is_enabled: updated.is_enabled,
      fee_policy: updated.fee_policy,
      default_fee_amount: updated.default_fee_amount,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
