import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { badRequest } from "@/lib/utils/errors";
import { settingPatchSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

async function allSettings() {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map((item) => [item.key, item.value]));
}

export async function GET(req: Request) {
  try {
    await requirePermission(req, "dashboard:access");
    return jsonOk(await allSettings());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requirePermission(req, "settings:write");
    const body = await readJson(req, settingPatchSchema);
    if (body.key !== "default_low_stock_threshold") badRequest("Paramètre non modifiable ici.");
    const existing = await prisma.setting.findUnique({ where: { key: body.key } });
    const value = body.value as Prisma.InputJsonValue;
    if (!existing) {
      await prisma.setting.create({ data: { key: body.key, value } });
    } else {
      await prisma.setting.update({ where: { key: body.key }, data: { value } });
    }
    await writeAudit({
      actorId: user.id,
      action: "settings.update",
      entityType: "setting",
      entityId: body.key,
      payload: body.value,
    });
    return jsonOk(await allSettings());
  } catch (error) {
    return handleRouteError(error);
  }
}
