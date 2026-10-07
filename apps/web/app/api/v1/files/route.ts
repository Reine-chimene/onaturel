import { handleRouteError, jsonOk } from "@/lib/api/route-utils";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/session";
import { ensureStorage, publicObjectUrl, uploadObject } from "@/lib/storage";
import { badRequest } from "@/lib/utils/errors";

export const runtime = "nodejs";

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const user = await requirePermission(req, "catalog:write");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) badRequest("Fichier vide.");
    const mime = (file.type || "").toLowerCase();
    const ext = ALLOWED[mime];
    if (!ext) badRequest("Formats acceptés : JPEG, PNG, WebP.");
    const data = Buffer.from(await file.arrayBuffer());
    if (!data.length) badRequest("Fichier vide.");
    if (data.length > MAX_BYTES) badRequest("Image trop volumineuse (8 Mo maximum).");
    const prefixParam = new URL(req.url).searchParams.get("prefix");
    const prefix = prefixParam === "cms" ? "cms/" : "products/";
    const key = `${prefix}${crypto.randomUUID().replaceAll("-", "")}.${ext}`;
    await ensureStorage();
    await uploadObject(key, data, mime);
    const asset = await prisma.fileAsset.create({
      data: {
        storage_key: key,
        original_filename: file.name || key,
        mime_type: mime,
        size_bytes: BigInt(data.length),
      },
    });
    await writeAudit({ actorId: user.id, action: "file.upload", entityType: "file", entityId: asset.id });
    return jsonOk({
      id: asset.id,
      url: publicObjectUrl(asset.storage_key),
      original_filename: asset.original_filename,
      mime_type: asset.mime_type,
      size_bytes: Number(asset.size_bytes),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
