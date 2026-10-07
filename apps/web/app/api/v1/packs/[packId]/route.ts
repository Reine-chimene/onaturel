import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { packOut, replaceItems, upsertPackPrices } from "@/lib/services/packs.service";
import { notFound } from "@/lib/utils/errors";
import { packPatchSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ packId: string }> }) {
  try {
    await requirePermission(req, "catalog:read");
    const { packId } = await ctx.params;
    return jsonOk(await packOut(packId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ packId: string }> }) {
  try {
    const user = await requirePermission(req, "catalog:write");
    const { packId } = await ctx.params;
    const body = await readJson(req, packPatchSchema);
    const bundle = await prisma.bundle.findUnique({ where: { id: packId } });
    if (!bundle) notFound("Pack introuvable.");
    await prisma.bundle.update({
      where: { id: packId },
      data: {
        ...(body.name != null ? { name: body.name.trim() } : {}),
        ...(body.slug != null ? { slug: body.slug } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.image_file_id !== undefined ? { image_file_id: body.image_file_id } : {}),
        ...(body.is_active != null ? { is_active: body.is_active } : {}),
        ...(body.is_archived != null
          ? { is_archived: body.is_archived, is_active: body.is_archived ? false : body.is_active ?? bundle.is_active }
          : {}),
      },
    });
    if (body.items) await replaceItems(packId, body.items);
    if (body.prices) await upsertPackPrices(packId, body.prices);
    await writeAudit({ actorId: user.id, action: "pack.update", entityType: "bundle", entityId: packId });
    return jsonOk(await packOut(packId));
  } catch (error) {
    return handleRouteError(error);
  }
}
