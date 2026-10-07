import { handleRouteError, jsonOk, queryString } from "@/lib/api/route-utils";
import { assertZoneScope, requirePermission } from "@/lib/auth/session";
import { salesLines } from "@/lib/services/reporting.service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requirePermission(req, "reports:sensitive");
    const params = queryString(req);
    const zoneId = params.get("zone_id");
    if (zoneId) assertZoneScope(user, zoneId);
    return jsonOk({
      items: await salesLines({
        dateFrom: params.get("date_from") ? new Date(params.get("date_from")!) : null,
        dateTo: params.get("date_to") ? new Date(params.get("date_to")!) : null,
        zoneId,
      }),
      note: "Lignes issues des commandes confirmées. XAF et EUR restent séparés.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
