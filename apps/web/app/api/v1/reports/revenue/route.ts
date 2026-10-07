import { handleRouteError, jsonOk, queryString } from "@/lib/api/route-utils";
import { assertZoneScope, requirePermission } from "@/lib/auth/session";
import { revenueQuery } from "@/lib/services/reporting.service";
import { SalesChannel } from "@/types/enums";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requirePermission(req, "reports:sensitive");
    const params = queryString(req);
    const zoneId = params.get("zone_id");
    if (zoneId) assertZoneScope(user, zoneId);
    const channel = params.get("channel") as SalesChannel | null;
    const rows = await revenueQuery({
      dateFrom: params.get("date_from") ? new Date(params.get("date_from")!) : null,
      dateTo: params.get("date_to") ? new Date(params.get("date_to")!) : null,
      zoneId,
      currencyCode: params.get("currency_code"),
      channel: channel && Object.values(SalesChannel).includes(channel) ? channel : null,
    });
    return jsonOk({
      rows,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
