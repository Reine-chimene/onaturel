import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { refresh } from "@/lib/services/auth.service";
import { refreshSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await readJson(req, refreshSchema);
    return jsonOk(await refresh(body.refresh_token));
  } catch (error) {
    return handleRouteError(error);
  }
}
