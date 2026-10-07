import { DEFAULT_SITE_CONTENT } from "@/lib/site-content/defaults";
import type { SiteContent } from "@/lib/site-content/types";

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base };
  for (const key of Object.keys(patch) as Array<keyof T>) {
    const value = patch[key];
    if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object") {
      out[key] = deepMerge(base[key] as Record<string, unknown>, value as Record<string, unknown>) as T[keyof T];
    } else if (value !== undefined) {
      out[key] = value as T[keyof T];
    }
  }
  return out;
}

export function mergeSiteContent(partial?: Partial<SiteContent> | null): SiteContent {
  return {
    contact: deepMerge(DEFAULT_SITE_CONTENT.contact, partial?.contact ?? {}),
    footer: deepMerge(DEFAULT_SITE_CONTENT.footer, partial?.footer ?? {}),
    home: deepMerge(DEFAULT_SITE_CONTENT.home, partial?.home ?? {}),
    histoire: deepMerge(DEFAULT_SITE_CONTENT.histoire, partial?.histoire ?? {}),
    boutique: deepMerge(DEFAULT_SITE_CONTENT.boutique, partial?.boutique ?? {}),
    seo: deepMerge(DEFAULT_SITE_CONTENT.seo, partial?.seo ?? {}),
  };
}
