import { handleRouteError, jsonOk } from "@/lib/api/route-utils";
import { getSiteContent } from "@/lib/services/site-content.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    return jsonOk(await getSiteContent());
  } catch (error) {
    return handleRouteError(error);
  }
}
