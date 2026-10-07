import { handleRouteError, jsonOk, queryString } from "@/lib/api/route-utils";
import { publicShop } from "@/lib/services/public.service";
import { badRequest } from "@/lib/utils/errors";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const zone = queryString(req).get("zone") || "";
    if (zone.length < 2 || zone.length > 64) badRequest("Zone invalide.");
    const category = queryString(req).get("category");
    return jsonOk(await publicShop(zone, category));
  } catch (error) {
    return handleRouteError(error);
  }
}
