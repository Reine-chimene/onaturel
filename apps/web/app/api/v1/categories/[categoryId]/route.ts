import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { categoryOut } from "@/lib/categories";
import { uniqueCategorySlug } from "@/lib/services/catalog.service";
import { notFound } from "@/lib/utils/errors";
import { categoryPatchSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ categoryId: string }> }) {
  try {
    const user = await requirePermission(req, "catalog:write");
    const { categoryId } = await ctx.params;
    const body = await readJson(req, categoryPatchSchema);
    const row = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!row) notFound("Catégorie introuvable.");
    let slug = row.slug;
    if (body.slug) slug = body.slug;
    else if (body.name) slug = await uniqueCategorySlug(body.name, row.id);
    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(body.name != null ? { name: body.name.trim() } : {}),
        slug,
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.parent_id !== undefined ? { parent_id: body.parent_id } : {}),
        ...(body.image_file_id !== undefined ? { image_file_id: body.image_file_id } : {}),
        ...(body.sort_order != null ? { sort_order: body.sort_order } : {}),
        ...(body.is_visible != null ? { is_visible: body.is_visible } : {}),
      },
      include: { image: true },
    });
    await writeAudit({ actorId: user.id, action: "category.update", entityType: "category", entityId: updated.id });
    return jsonOk(categoryOut(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}
