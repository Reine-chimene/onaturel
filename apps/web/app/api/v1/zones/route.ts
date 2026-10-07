import { handleRouteError, jsonOk } from "@/lib/api/route-utils";
import { listZones } from "@/lib/services/zones.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    return jsonOk(await listZones(true));
  } catch (error) {
    return handleRouteError(error);
  }
}
