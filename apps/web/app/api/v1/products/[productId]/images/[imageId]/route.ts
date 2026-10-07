import { handleRouteError, jsonOk } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { loadProduct, productAdminOut } from "@/lib/services/catalog.service";
import { notFound } from "@/lib/utils/errors";

export const runtime = "nodejs";

export async function DELETE(req: Request, ctx: { params: Promise<{ productId: string; imageId: string }> }) {
  try {
    const user = await requirePermission(req, "catalog:write");
    const { productId, imageId } = await ctx.params;
    const product = await loadProduct(productId);
    const image = product.images.find((item) => item.id === imageId);
    if (!image) notFound("Image introuvable.");
    const wasPrimary = image.is_primary;
    await prisma.productImage.delete({ where: { id: imageId } });
    if (wasPrimary) {
      const remaining = product.images.filter((item) => item.id !== imageId).sort((a, b) => a.sort_order - b.sort_order);
      if (remaining[0]) {
        await prisma.productImage.update({ where: { id: remaining[0].id }, data: { is_primary: true } });
      }
    }
    await writeAudit({ actorId: user.id, action: "product.image.delete", entityType: "product", entityId: productId });
    return jsonOk(await productAdminOut(productId));
  } catch (error) {
    return handleRouteError(error);
  }
}
