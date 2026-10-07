import type { Metadata } from "next";
import { Suspense } from "react";
import { BoutiquePage } from "@/components/boutique/BoutiquePage";
import { SITE_LOCALE, SITE_NAME, getSiteUrl } from "@/lib/seo";

const TITLE = "Boutique";
const DESCRIPTION =
  "Explorez l’univers O’Naturelle : cosmétique bio, cosmétique spirituelle, plantes, rituels, parfums et accessoires. Prix et disponibilités selon la zone Cameroun ou Europe.";

const site = getSiteUrl();
const url = `${site}/boutique`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/boutique" },
  openGraph: {
    title: `${TITLE} · ${SITE_NAME}`,
    description: DESCRIPTION,
    locale: SITE_LOCALE,
    type: "website",
    url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · ${SITE_NAME}`,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BoutiquePage />
    </Suspense>
  );
}
