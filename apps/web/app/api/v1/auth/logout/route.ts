import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { getCurrentUser } from "@/lib/auth/session";
import { logout } from "@/lib/services/auth.service";
import { refreshSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    const body = await readJson(req, refreshSchema);
    return jsonOk(await logout(user.id, body.refresh_token));
  } catch (error) {
    return handleRouteError(error);
  }
}
