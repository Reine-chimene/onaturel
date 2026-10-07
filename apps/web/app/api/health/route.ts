import { jsonOk, handleRouteError } from "@/lib/api/route-utils";

export const runtime = "nodejs";

export async function GET() {
  try {
    return jsonOk({ status: "ok", brand: "O'Naturelle" });
  } catch (error) {
    return handleRouteError(error);
  }
}
