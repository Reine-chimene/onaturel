import { handleRouteError, jsonOk } from "@/lib/api/route-utils";
import { requirePermission } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requirePermission(req, "cash:close");
    return jsonOk([]);
  } catch (error) {
    return handleRouteError(error);
  }
}
