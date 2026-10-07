import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { login } from "@/lib/services/auth.service";
import { loginSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await readJson(req, loginSchema);
    return jsonOk(await login(body.email, body.password));
  } catch (error) {
    return handleRouteError(error);
  }
}
