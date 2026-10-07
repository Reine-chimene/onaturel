import { handleRouteError, jsonOk, queryString } from "@/lib/api/route-utils";
import { assertZoneScope, requirePermission } from "@/lib/auth/session";
import { topProducts } from "@/lib/services/reporting.service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requirePermission(req, "reports:sensitive");
    const params = queryString(req);
    const zoneId = params.get("zone_id");
    if (zoneId) assertZoneScope(user, zoneId);
    const limit = Math.min(50, Math.max(1, Number(params.get("limit") || 10)));
    return jsonOk({
      items: await topProducts({
        dateFrom: params.get("date_from") ? new Date(params.get("date_from")!) : null,
        dateTo: params.get("date_to") ? new Date(params.get("date_to")!) : null,
        zoneId,
        limit,
      }),
      note: "Classement par zone et devise. Aucune donnée fictive.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
