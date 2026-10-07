import { handleRouteError, jsonOk, queryString } from "@/lib/api/route-utils";
import { requirePermission } from "@/lib/auth/session";
import { dashboardOverview } from "@/lib/services/reporting.service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requirePermission(req, "dashboard:access");
    const params = queryString(req);
    const dateFrom = params.get("date_from") ? new Date(params.get("date_from")!) : null;
    const dateTo = params.get("date_to") ? new Date(params.get("date_to")!) : null;
    return jsonOk(await dashboardOverview(dateFrom, dateTo));
  } catch (error) {
    return handleRouteError(error);
  }
}
