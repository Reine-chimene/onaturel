import { handleRouteError, jsonOk, readJson } from "@/lib/api/route-utils";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { getSiteContent, updateSiteContentSection } from "@/lib/services/site-content.service";
import { badRequest } from "@/lib/utils/errors";
import { contentPatchSchema } from "@/lib/validations";
import type { SiteContent } from "@/lib/site-content/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requirePermission(req, "dashboard:access");
    return jsonOk(await getSiteContent());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requirePermission(req, "settings:write");
    const body = await readJson(req, contentPatchSchema);
    const section = body.section as keyof SiteContent;
    if (!["contact", "footer", "home", "histoire", "boutique", "seo"].includes(section)) {
      badRequest("Section inconnue.");
    }
    await updateSiteContentSection(section, body.value as SiteContent[typeof section]);
    await writeAudit({
      actorId: user.id,
      action: "content.update",
      entityType: "content",
      entityId: section,
    });
    return jsonOk(await getSiteContent());
  } catch (error) {
    return handleRouteError(error);
  }
}
