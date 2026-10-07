import { handleRouteError, jsonOk } from "@/lib/api/route-utils";
import { requirePermission } from "@/lib/auth/session";
import { listZones } from "@/lib/services/zones.service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requirePermission(req, "zones:write");
    return jsonOk(await listZones(false));
  } catch (error) {
    return handleRouteError(error);
  }
}
