import { handleRouteError, jsonOk, queryString, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { attachImage, loadProduct, productAdminOut } from "@/lib/services/catalog.service";
import { notFound } from "@/lib/utils/errors";
import { imageOrderSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  try {
    const user = await requirePermission(req, "catalog:write");
    const { productId } = await ctx.params;
    const fileId = queryString(req).get("file_id");
    const asPrimary = queryString(req).get("as_primary") === "true";
    if (!fileId) notFound("Fichier introuvable.");
    await loadProduct(productId);
    const asset = await prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!asset) notFound("Fichier introuvable.");
    await attachImage(productId, asset, asPrimary);
    await writeAudit({ actorId: user.id, action: "product.image.add", entityType: "product", entityId: productId });
    return jsonOk(await productAdminOut(productId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  try {
    const user = await requirePermission(req, "catalog:write");
    const { productId } = await ctx.params;
    const body = await readJson(req, imageOrderSchema);
    const product = await loadProduct(productId);
    const byId = new Map(product.images.map((image) => [image.id, image]));
    let primarySet = false;
    for (const item of body) {
      const image = byId.get(item.id);
      if (!image) notFound("Image introuvable.");
      const isPrimary = Boolean(item.is_primary) && !primarySet;
      if (isPrimary) primarySet = true;
      await prisma.productImage.update({
        where: { id: image.id },
        data: { sort_order: item.sort_order, is_primary: isPrimary },
      });
    }
    if (!primarySet && product.images.length) {
      const first = [...product.images].sort((a, b) => a.sort_order - b.sort_order)[0];
      await prisma.productImage.update({ where: { id: first.id }, data: { is_primary: true } });
    }
    await writeAudit({ actorId: user.id, action: "product.image.reorder", entityType: "product", entityId: productId });
    return jsonOk(await productAdminOut(productId));
  } catch (error) {
    return handleRouteError(error);
  }
}
