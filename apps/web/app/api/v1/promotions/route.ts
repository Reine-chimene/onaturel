import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { promotionIsLive, syncPromotionPrice } from "@/lib/services/promotions.service";
import { promotionWriteSchema } from "@/lib/validations";

export const runtime = "nodejs";

async function promotionOut(id: string) {
  const row = await prisma.promotion.findUnique({ where: { id } });
  if (!row) return null;
  const product = row.product_id ? await prisma.product.findUnique({ where: { id: row.product_id } }) : null;
  const bundle = row.bundle_id ? await prisma.bundle.findUnique({ where: { id: row.bundle_id } }) : null;
  return {
    id: row.id,
    product_id: row.product_id,
    bundle_id: row.bundle_id,
    product_name: product?.name ?? null,
    bundle_name: bundle?.name ?? null,
    zone_id: row.zone_id,
    promo_price_amount: row.promo_price_amount,
    is_active: row.is_active,
    is_live: promotionIsLive(row),
    starts_at: row.starts_at?.toISOString() ?? null,
    ends_at: row.ends_at?.toISOString() ?? null,
  };
}

export async function GET(req: Request) {
  try {
    await requirePermission(req, "catalog:read");
    const rows = await prisma.promotion.findMany({ orderBy: { created_at: "desc" } });
    return jsonOk(await Promise.all(rows.map((row) => promotionOut(row.id))));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePermission(req, "pricing:write");
    const body = await readJson(req, promotionWriteSchema);
    const row = await prisma.promotion.create({
      data: {
        product_id: body.product_id ?? null,
        bundle_id: body.bundle_id ?? null,
        zone_id: body.zone_id,
        promo_price_amount: body.promo_price_amount,
        is_active: body.is_active ?? true,
        starts_at: body.starts_at ? new Date(body.starts_at) : null,
        ends_at: body.ends_at ? new Date(body.ends_at) : null,
      },
    });
    if (row.product_id) {
      await prisma.promotion.update({ where: { id: row.id }, data: { bundle_id: null } });
    } else if (row.bundle_id) {
      await prisma.promotion.update({ where: { id: row.id }, data: { product_id: null } });
    }
    const fresh = await prisma.promotion.findUnique({ where: { id: row.id } });
    await syncPromotionPrice(fresh!);
    await writeAudit({ actorId: user.id, action: "promotion.create", entityType: "promotion", entityId: row.id });
    return jsonOk(await promotionOut(row.id));
  } catch (error) {
    return handleRouteError(error);
  }
}
