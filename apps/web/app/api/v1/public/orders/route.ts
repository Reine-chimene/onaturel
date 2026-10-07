import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { createPublicOrder, publicOrderOut } from "@/lib/services/checkout.service";
import { publicOrderCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await readJson(req, publicOrderCreateSchema);
    const { order, zone } = await createPublicOrder({
      zoneSlug: body.zone,
      fulfillmentMode: body.fulfillment_mode,
      customerName: body.customer_name,
      customerPhone: body.customer_phone,
      city: body.city,
      neighborhood: body.neighborhood,
      items: body.items,
    });
    return jsonOk(publicOrderOut(order, zone));
  } catch (error) {
    return handleRouteError(error);
  }
}
