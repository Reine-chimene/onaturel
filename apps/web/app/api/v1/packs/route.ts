import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { createPackSlug, packOut, replaceItems, upsertPackPrices } from "@/lib/services/packs.service";
import { packWriteSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requirePermission(req, "catalog:read");
    const rows = await prisma.bundle.findMany({
      where: { is_archived: false },
      orderBy: { name: "asc" },
    });
    return jsonOk(await Promise.all(rows.map((row) => packOut(row.id))));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePermission(req, "catalog:write");
    const body = await readJson(req, packWriteSchema);
    const slug = await createPackSlug(body.name, body.slug);
    const bundle = await prisma.bundle.create({
      data: {
        name: body.name.trim(),
        slug,
        description: body.description,
        image_file_id: body.image_file_id ?? null,
        is_active: body.is_active ?? true,
      },
    });
    await replaceItems(bundle.id, body.items ?? []);
    await upsertPackPrices(bundle.id, body.prices ?? []);
    await writeAudit({ actorId: user.id, action: "pack.create", entityType: "bundle", entityId: bundle.id });
    return jsonOk(await packOut(bundle.id));
  } catch (error) {
    return handleRouteError(error);
  }
}
