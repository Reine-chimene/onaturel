import { handleRouteError, jsonOk, queryString, readJson } from "@/lib/api/route-utils";
import { assertZoneScope, requirePermission, writeAudit } from "@/lib/auth/session";
import { listProductsAdmin, loadProduct, productAdminOut, uniqueProductSlug, upsertZonePrice, setZoneQty } from "@/lib/services/catalog.service";
import { conflict } from "@/lib/utils/errors";
import { prisma } from "@/lib/db/prisma";
import { productWriteSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requirePermission(req, "catalog:read");
    const params = queryString(req);
    const zoneId = params.get("zone_id");
    if (zoneId) assertZoneScope(user, zoneId);
    return jsonOk(
      await listProductsAdmin({
        role: user.role,
        zoneId,
        q: params.get("q"),
        includeArchived: params.get("include_archived") === "true",
      }),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePermission(req, "catalog:write");
    const body = await readJson(req, productWriteSchema);
    const slug = body.slug || (await uniqueProductSlug(body.name));
    if (await prisma.product.findUnique({ where: { slug } })) conflict("Ce slug est déjà utilisé.");
    const sku = body.sku?.trim() || null;
    if (sku && (await prisma.product.findUnique({ where: { sku } }))) conflict("Cette référence existe déjà.");
    const product = await prisma.product.create({
      data: {
        name: body.name.trim(),
        slug,
        sku,
        description: body.description,
        category_id: body.category_id ?? null,
        is_new: body.is_new ?? false,
        is_featured: body.is_featured ?? false,
        is_active: body.is_active ?? true,
      },
    });
    for (const price of body.prices ?? []) {
      await upsertZonePrice({
        productId: product.id,
        zoneId: price.zone_id,
        priceAmount: price.price_amount,
        isAvailable: price.is_available,
      });
    }
    for (const stock of body.stocks ?? []) {
      await setZoneQty({ productId: product.id, zoneId: stock.zone_id, qty: stock.qty, actorId: user.id });
    }
    await writeAudit({ actorId: user.id, action: "product.create", entityType: "product", entityId: product.id });
    await loadProduct(product.id);
    return jsonOk(await productAdminOut(product.id));
  } catch (error) {
    return handleRouteError(error);
  }
}
