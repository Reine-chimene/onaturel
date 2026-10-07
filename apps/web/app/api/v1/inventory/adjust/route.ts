import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { defaultLowStockThreshold, setZoneQty, stockStatus } from "@/lib/services/inventory.service";
import { adjustSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requirePermission(req, "inventory:write");
    const body = await readJson(req, adjustSchema);
    const position = await setZoneQty({
      productId: body.product_id,
      zoneId: body.zone_id,
      qty: body.qty,
      actorId: user.id,
      note: body.note,
    });
    await writeAudit({
      actorId: user.id,
      action: "inventory.adjust",
      entityType: "inventory_position",
      entityId: position.id,
      payload: body,
    });
    const threshold = await defaultLowStockThreshold();
    return jsonOk({
      product_id: position.product_id,
      zone_id: position.zone_id,
      qty: position.qty,
      stock_status: stockStatus(position.qty, position.low_stock_threshold ?? threshold),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
