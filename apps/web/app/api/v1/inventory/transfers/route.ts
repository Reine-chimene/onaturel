import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { transferBetweenZones } from "@/lib/services/inventory.service";
import { transferSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requirePermission(req, "inventory:write");
    const body = await readJson(req, transferSchema);
    const groupId = await transferBetweenZones({
      productId: body.product_id,
      fromZoneId: body.from_zone_id,
      toZoneId: body.to_zone_id,
      quantity: body.quantity,
      actorId: user.id,
      note: body.note,
    });
    await writeAudit({
      actorId: user.id,
      action: "inventory.transfer",
      entityType: "inventory_movement",
      entityId: groupId,
      payload: body,
    });
    return jsonOk({ transfer_group_id: groupId });
  } catch (error) {
    return handleRouteError(error);
  }
}
