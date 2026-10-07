import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { categoryOut } from "@/lib/categories";
import { uniqueCategorySlug } from "@/lib/services/catalog.service";
import { conflict } from "@/lib/utils/errors";
import { categoryWriteSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requirePermission(req, "catalog:read");
    const rows = await prisma.category.findMany({
      include: { image: true },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    });
    return jsonOk(rows.map(categoryOut));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePermission(req, "catalog:write");
    const body = await readJson(req, categoryWriteSchema);
    const slug = body.slug || (await uniqueCategorySlug(body.name));
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) conflict("Cette catégorie existe déjà.");
    const row = await prisma.category.create({
      data: {
        name: body.name.trim(),
        slug,
        description: body.description,
        parent_id: body.parent_id ?? null,
        image_file_id: body.image_file_id ?? null,
        sort_order: body.sort_order ?? 0,
        is_visible: body.is_visible ?? true,
      },
      include: { image: true },
    });
    await writeAudit({ actorId: user.id, action: "category.create", entityType: "category", entityId: row.id });
    return jsonOk(categoryOut(row));
  } catch (error) {
    return handleRouteError(error);
  }
}
