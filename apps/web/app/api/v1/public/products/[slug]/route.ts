import { handleRouteError, jsonOk, queryString } from "@/lib/api/route-utils";
import { publicProduct } from "@/lib/services/public.service";
import { badRequest } from "@/lib/utils/errors";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const zone = queryString(req).get("zone") || "";
    if (zone.length < 2 || zone.length > 64) badRequest("Zone invalide.");
    return jsonOk(await publicProduct(slug, zone));
  } catch (error) {
    return handleRouteError(error);
  }
}
