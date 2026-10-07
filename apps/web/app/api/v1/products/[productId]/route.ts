import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { productAdminOut, uniqueProductSlug, upsertZonePrice, setZoneQty } from "@/lib/services/catalog.service";
import { notFound } from "@/lib/utils/errors";
import { productPatchSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  try {
    await requirePermission(req, "catalog:read");
    const { productId } = await ctx.params;
    return jsonOk(await productAdminOut(productId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  try {
    const user = await requirePermission(req, "catalog:write");
    const { productId } = await ctx.params;
    const body = await readJson(req, productPatchSchema);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) notFound("Produit introuvable.");
    let slug = product.slug;
    if (body.slug) slug = body.slug;
    else if (body.name) slug = await uniqueProductSlug(body.name, product.id);
    await prisma.product.update({
      where: { id: productId },
      data: {
        ...(body.name != null ? { name: body.name.trim() } : {}),
        slug,
        ...(body.sku !== undefined ? { sku: body.sku?.trim() || null } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.category_id !== undefined ? { category_id: body.category_id } : {}),
        ...(body.is_new != null ? { is_new: body.is_new } : {}),
        ...(body.is_featured != null ? { is_featured: body.is_featured } : {}),
        ...(body.is_active != null ? { is_active: body.is_active } : {}),
        ...(body.is_archived != null
          ? { is_archived: body.is_archived, is_active: body.is_archived ? false : body.is_active ?? product.is_active }
          : {}),
      },
    });
    for (const price of body.prices ?? []) {
      await upsertZonePrice({
        productId,
        zoneId: price.zone_id,
        priceAmount: price.price_amount,
        isAvailable: price.is_available,
      });
    }
    for (const stock of body.stocks ?? []) {
      await setZoneQty({ productId, zoneId: stock.zone_id, qty: stock.qty, actorId: user.id });
    }
    await writeAudit({ actorId: user.id, action: "product.update", entityType: "product", entityId: productId });
    return jsonOk(await productAdminOut(productId));
  } catch (error) {
    return handleRouteError(error);
  }
}
