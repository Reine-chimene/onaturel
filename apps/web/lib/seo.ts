/** Public site URL. Set NEXT_PUBLIC_SITE_URL when the domain is chosen. */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.WEB_PUBLIC_URL ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export const SITE_NAME = "O’Naturelle";
export const SITE_TAGLINE = "Nous prenons soin de votre corps et de votre esprit.";
export const SITE_DESCRIPTION =
  "Depuis 2012, O’Naturelle célèbre une approche authentique de la beauté, du bien-être et des traditions. Cosmétique bio, cosmétique spirituelle, rituels de soins.";
export const SITE_TITLE = "O’Naturelle — cosmétique bio et spirituelle";
export const SITE_LOCALE = "fr_FR";
export const OG_IMAGE = "/images/hero.jpg";
