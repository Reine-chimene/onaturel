import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { deletePromotion, promotionIsLive, syncPromotionPrice } from "@/lib/services/promotions.service";
import { badRequest, notFound } from "@/lib/utils/errors";
import { promotionPatchSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ promotionId: string }> }) {
  try {
    const user = await requirePermission(req, "pricing:write");
    const { promotionId } = await ctx.params;
    const body = await readJson(req, promotionPatchSchema);
    const row = await prisma.promotion.findUnique({ where: { id: promotionId } });
    if (!row) notFound("Promotion introuvable.");
    if (body.promo_price_amount != null && body.promo_price_amount <= 0) {
      badRequest("Prix promotionnel invalide.");
    }
    const updated = await prisma.promotion.update({
      where: { id: promotionId },
      data: {
        ...(body.promo_price_amount != null ? { promo_price_amount: body.promo_price_amount } : {}),
        ...(body.is_active != null ? { is_active: body.is_active } : {}),
        ...(body.starts_at !== undefined ? { starts_at: body.starts_at ? new Date(body.starts_at) : null } : {}),
        ...(body.ends_at !== undefined ? { ends_at: body.ends_at ? new Date(body.ends_at) : null } : {}),
        ...(body.zone_id ? { zone_id: body.zone_id } : {}),
      },
    });
    await syncPromotionPrice(updated);
    await writeAudit({ actorId: user.id, action: "promotion.update", entityType: "promotion", entityId: updated.id });
    const product = updated.product_id ? await prisma.product.findUnique({ where: { id: updated.product_id } }) : null;
    const bundle = updated.bundle_id ? await prisma.bundle.findUnique({ where: { id: updated.bundle_id } }) : null;
    return jsonOk({
      id: updated.id,
      product_id: updated.product_id,
      bundle_id: updated.bundle_id,
      product_name: product?.name ?? null,
      bundle_name: bundle?.name ?? null,
      zone_id: updated.zone_id,
      promo_price_amount: updated.promo_price_amount,
      is_active: updated.is_active,
      is_live: promotionIsLive(updated),
      starts_at: updated.starts_at?.toISOString() ?? null,
      ends_at: updated.ends_at?.toISOString() ?? null,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ promotionId: string }> }) {
  try {
    const user = await requirePermission(req, "pricing:write");
    const { promotionId } = await ctx.params;
    await deletePromotion(promotionId);
    await writeAudit({ actorId: user.id, action: "promotion.delete", entityType: "promotion", entityId: promotionId });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
