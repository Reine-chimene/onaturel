import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { getOrCreatePosition } from "@/lib/services/inventory.service";
import { thresholdSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  try {
    const user = await requirePermission(req, "inventory:write");
    const body = await readJson(req, thresholdSchema);
    const position = await getOrCreatePosition(body.product_id, body.zone_id);
    const updated = await prisma.inventoryPosition.update({
      where: { id: position.id },
      data: { low_stock_threshold: body.low_stock_threshold },
    });
    await writeAudit({
      actorId: user.id,
      action: "inventory.threshold",
      entityType: "inventory_position",
      entityId: updated.id,
    });
    return jsonOk({
      product_id: updated.product_id,
      zone_id: updated.zone_id,
      low_stock_threshold: updated.low_stock_threshold,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
