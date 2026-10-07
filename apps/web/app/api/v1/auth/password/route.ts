import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { requireOwner } from "@/lib/auth/session";
import { changePassword } from "@/lib/services/auth.service";
import { changePasswordSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  try {
    const user = await requireOwner(req);
    const body = await readJson(req, changePasswordSchema);
    return jsonOk(
      await changePassword(user.id, body.current_password, body.new_password),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
