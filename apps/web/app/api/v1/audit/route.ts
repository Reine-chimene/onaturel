import { handleRouteError, jsonOk, queryString } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requirePermission(req, "audit:read");
    const limit = Number(queryString(req).get("limit") || 100);
    const rows = await prisma.auditLog.findMany({
      orderBy: { created_at: "desc" },
      take: limit,
    });
    return jsonOk(
      rows.map((item) => ({
        id: item.id,
        actor_id: item.actor_id,
        action: item.action,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        created_at: item.created_at.toISOString(),
      })),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
