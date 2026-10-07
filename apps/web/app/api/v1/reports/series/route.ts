import { handleRouteError, jsonOk, queryString } from "@/lib/api/route-utils";
import { assertZoneScope, requirePermission } from "@/lib/auth/session";
import { revenueSeries } from "@/lib/services/reporting.service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requirePermission(req, "reports:sensitive");
    const params = queryString(req);
    const zoneId = params.get("zone_id");
    if (zoneId) assertZoneScope(user, zoneId);
    let granularity = params.get("granularity") || "day";
    if (granularity !== "day" && granularity !== "month") granularity = "day";
    return jsonOk({
      series: await revenueSeries({
        granularity,
        dateFrom: params.get("date_from") ? new Date(params.get("date_from")!) : null,
        dateTo: params.get("date_to") ? new Date(params.get("date_to")!) : null,
        zoneId,
      }),
      note: "Une série par zone et devise. Ne jamais fusionner XAF et EUR.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
