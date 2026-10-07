import { handleRouteError, jsonOk, queryString } from "@/lib/api/route-utils";
import { loadZone, modePayload } from "@/lib/services/checkout.service";
import { badRequest } from "@/lib/utils/errors";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const zoneSlug = queryString(req).get("zone") || "";
    if (zoneSlug.length < 2 || zoneSlug.length > 64) badRequest("Zone invalide.");
    const zone = await loadZone(zoneSlug);
    const modes = [...zone.fulfillment_modes].sort((a, b) => a.mode.localeCompare(b.mode));
    return jsonOk({
      zone_slug: zone.slug,
      zone_name: zone.name,
      currency_code: zone.currency.code,
      fulfillment_modes: modes.map(modePayload),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
