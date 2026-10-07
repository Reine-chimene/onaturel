import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { loadZone, quoteItems } from "@/lib/services/checkout.service";
import { quoteSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await readJson(req, quoteSchema);
    const zone = await loadZone(body.zone);
    if (!body.items.length) {
      return jsonOk({
        zone_slug: zone.slug,
        currency_code: zone.currency.code,
        products_amount: 0,
        can_submit: false,
        lines: [],
      });
    }
    const quoted = await quoteItems(zone, body.items);
    return jsonOk({
      zone_slug: zone.slug,
      currency_code: zone.currency.code,
      products_amount: quoted.productsAmount,
      can_submit: quoted.canSubmit,
      lines: quoted.lines,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
