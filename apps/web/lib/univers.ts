export type UniverseSlug =
  | "cosmetique-classique"
  | "produits-capillaires"
  | "gommages"
  | "diete"
  | "divers"
  | "produits-spirituels-intense"
  | "sacs-accessoires"
  | "parfums";

export type Universe = {
  slug: UniverseSlug;
  apiSlug: string;
  name: string;
  nav: string;
  kicker: string;
  lead: string;
  photo: string;
};

export const UNIVERSES: Universe[] = [
  {
    slug: "cosmetique-classique",
    apiSlug: "cosmetique-bio",
    name: "Cosmétique classique",
    nav: "Cosmétique classique",
    kicker: "Soin",
    lead: "Sérums, masques et gestes du quotidien.",
    photo: "/images/categories/classique.webp",
  },
  {
    slug: "produits-capillaires",
    apiSlug: "produits-capillaires",
    name: "Produits capillaires",
    nav: "Produits capillaires",
    kicker: "Cheveux",
    lead: "Soins et rituels pour la chevelure.",
    photo: "/images/categories/capillaires.webp",
  },
  {
    slug: "gommages",
    apiSlug: "gommages",
    name: "Gommages",
    nav: "Gommages",
    kicker: "Corps",
    lead: "Textures et gestes d’exfoliation.",
    photo: "/images/categories/gommages.webp",
  },
  {
    slug: "diete",
    apiSlug: "diete",
    name: "Diète",
    nav: "Diète",
    kicker: "Cours",
    lead: "Infusions, concentrés et compléments de la maison.",
    photo: "/images/categories/diete.webp",
  },
  {
    slug: "divers",
    apiSlug: "divers",
    name: "Divers",
    nav: "Divers",
    kicker: "Maison",
    lead: "Les indispensables du quotidien O’Naturelle.",
    photo: "/images/categories/divers.webp",
  },
  {
    slug: "produits-spirituels-intense",
    apiSlug: "produits-spirituels-intense",
    name: "Produits spirituels",
    nav: "Produits spirituels",
    kicker: "Rituel",
    lead: "Ligne spirituelle de la maison.",
    photo: "/images/categories/spirituels.webp",
  },
  {
    slug: "sacs-accessoires",
    apiSlug: "sacs-accessoires",
    name: "Sacs & accessoires",
    nav: "Sacs & accessoires",
    kicker: "Geste",
    lead: "Sacs et accessoires — sélection à venir.",
    photo: "/images/categories/sacs.webp",
  },
  {
    slug: "parfums",
    apiSlug: "parfums",
    name: "Parfums",
    nav: "Parfums",
    kicker: "Sillage",
    lead: "L’univers parfum — sélection à venir.",
    photo: "/images/categories/parfums.webp",
  },
];

export const UNIVERSE_BY_SLUG = Object.fromEntries(UNIVERSES.map((item) => [item.slug, item])) as Record<
  UniverseSlug,
  Universe
>;

const URL_ALIASES: Record<string, UniverseSlug> = {
  "cosmetique-bio": "cosmetique-classique",
  "cosmetique-spirituelle": "produits-spirituels-intense",
};

export function universeOf(slug: string | null | undefined): Universe | null {
  if (!slug) return null;
  const mapped = URL_ALIASES[slug] ?? slug;
  return UNIVERSE_BY_SLUG[mapped as UniverseSlug] ?? null;
}

export function apiCategorySlug(urlSlug: string | null | undefined): string | null {
  if (!urlSlug || urlSlug === "all") return null;
  return universeOf(urlSlug)?.apiSlug ?? urlSlug;
}
