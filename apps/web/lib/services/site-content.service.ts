import { prisma } from "@/lib/db/prisma";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content/defaults";
import { mergeSiteContent } from "@/lib/site-content/merge";
import { CONTENT_KEYS, type CmsImage, type SiteContent } from "@/lib/site-content/types";
import { publicObjectUrl } from "@/lib/storage";

function deepMergeSection<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base };
  for (const key of Object.keys(patch) as Array<keyof T>) {
    const value = patch[key];
    if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object") {
      out[key] = deepMergeSection(base[key] as Record<string, unknown>, value as Record<string, unknown>) as T[keyof T];
    } else if (value !== undefined) {
      out[key] = value as T[keyof T];
    }
  }
  return out;
}

async function resolveImage(image: CmsImage): Promise<CmsImage> {
  if (!image.file_id) return image;
  const asset = await prisma.fileAsset.findUnique({ where: { id: image.file_id } });
  if (!asset) return image;
  return { ...image, url: publicObjectUrl(asset.storage_key) };
}

async function resolveImages<T>(value: T): Promise<T> {
  if (Array.isArray(value)) {
    const items = await Promise.all(value.map((item) => resolveImages(item)));
    return items as T;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("file_id" in record || ("url" in record && "alt" in record)) {
      return (await resolveImage(record as CmsImage)) as T;
    }
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(record)) {
      out[key] = await resolveImages(item);
    }
    return out as T;
  }
  return value;
}

async function loadSection<K extends keyof SiteContent>(key: K): Promise<SiteContent[K]> {
  const settingKey = CONTENT_KEYS[key];
  const row = await prisma.setting.findUnique({ where: { key: settingKey } });
  const defaults = DEFAULT_SITE_CONTENT[key];
  if (!row?.value || typeof row.value !== "object") return defaults;
  return deepMergeSection(defaults as Record<string, unknown>, row.value as Record<string, unknown>) as SiteContent[K];
}

export async function getSiteContent(): Promise<SiteContent> {
  await ensureDefaultSiteContent();
  const [contact, footer, home, histoire, boutique, seo] = await Promise.all([
    loadSection("contact"),
    loadSection("footer"),
    loadSection("home"),
    loadSection("histoire"),
    loadSection("boutique"),
    loadSection("seo"),
  ]);
  const merged = mergeSiteContent({ contact, footer, home, histoire, boutique, seo });
  return resolveImages(merged);
}

export async function updateSiteContentSection<K extends keyof SiteContent>(
  section: K,
  value: SiteContent[K],
): Promise<SiteContent[K]> {
  const key = CONTENT_KEYS[section];
  const existing = await prisma.setting.findUnique({ where: { key } });
  if (!existing) {
    await prisma.setting.create({ data: { key, value } });
  } else {
    await prisma.setting.update({ where: { key }, data: { value } });
  }
  return loadSection(section);
}

export async function ensureDefaultSiteContent(): Promise<void> {
  for (const [section, key] of Object.entries(CONTENT_KEYS) as Array<[keyof SiteContent, string]>) {
    const existing = await prisma.setting.findUnique({ where: { key } });
    if (!existing) {
      await prisma.setting.create({
        data: { key, value: DEFAULT_SITE_CONTENT[section] as object },
      });
    }
  }
}
