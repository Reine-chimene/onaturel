import { handleRouteError, jsonOk } from "@/lib/api/route-utils";
import { getCurrentUser } from "@/lib/auth/session";
import { meOut } from "@/lib/services/auth.service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    return jsonOk(meOut(user));
  } catch (error) {
    return handleRouteError(error);
  }
}
