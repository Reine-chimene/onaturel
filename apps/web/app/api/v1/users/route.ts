import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/session";
import { createUser, meOut } from "@/lib/services/auth.service";
import { createUserSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requirePermission(req, "users:read");
    const rows = await prisma.user.findMany({ orderBy: { created_at: "asc" } });
    return jsonOk(rows.map(meOut));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requirePermission(req, "users:write");
    const body = await readJson(req, createUserSchema);
    const user = await createUser({
      email: body.email,
      password: body.password,
      fullName: body.full_name,
      role: body.role,
      assignedZoneId: body.assigned_zone_id,
      actorId: actor.id,
    });
    return jsonOk(user, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
