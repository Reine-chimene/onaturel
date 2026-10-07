"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content/defaults";
import { mergeSiteContent } from "@/lib/site-content/merge";
import type { SiteContent } from "@/lib/site-content/types";

let cached: SiteContent | null = null;
let inflight: Promise<SiteContent> | null = null;

export function invalidateSiteContentCache() {
  cached = null;
  inflight = null;
}

export async function fetchSiteContent(): Promise<SiteContent> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch("/api/v1/public/site-content")
      .then(async (res) => {
        if (!res.ok) throw new Error("Contenu indisponible.");
        return res.json() as Promise<SiteContent>;
      })
      .then((data) => {
        cached = mergeSiteContent(data);
        return cached;
      })
      .catch(() => {
        cached = DEFAULT_SITE_CONTENT;
        return DEFAULT_SITE_CONTENT;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(cached ?? DEFAULT_SITE_CONTENT);
  const [ready, setReady] = useState(Boolean(cached));

  useEffect(() => {
    let cancelled = false;
    fetchSiteContent().then((data) => {
      if (cancelled) return;
      setContent(data);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { content, ready };
}

export function whatsappHref(e164: string) {
  return `https://wa.me/${e164.replace(/\D/g, "")}`;
}
