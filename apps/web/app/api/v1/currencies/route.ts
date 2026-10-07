import { handleRouteError, jsonOk } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await prisma.currency.findMany({ orderBy: { code: "asc" } });
    return jsonOk(rows);
  } catch (error) {
    return handleRouteError(error);
  }
}
