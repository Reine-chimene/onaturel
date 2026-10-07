import type { Universe } from "@/lib/univers";

type CategoryImage = { slug: string; image_url?: string | null; description?: string | null };

export function universePhoto(universe: Universe, categories: CategoryImage[]): string {
  const match = categories.find((item) => item.slug === universe.apiSlug);
  return match?.image_url ?? universe.photo;
}

export function universeLead(universe: Universe, categories: CategoryImage[]): string {
  const match = categories.find((item) => item.slug === universe.apiSlug);
  return match?.description?.trim() || universe.lead;
}
