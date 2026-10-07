import type { Metadata } from "next";
import { HistoirePage } from "@/components/histoire/HistoirePage";
import { SITE_LOCALE, SITE_NAME, SITE_TAGLINE, getSiteUrl } from "@/lib/seo";

const TITLE = "Notre histoire";
const DESCRIPTION =
  "Depuis 2012, O’Naturelle accompagne une approche authentique de la beauté et du soin. Cosmétique bio, cosmétique spirituelle, rituels — prendre soin du corps et de l’esprit.";

const site = getSiteUrl();
const url = `${site}/notre-histoire`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/notre-histoire" },
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `${TITLE} · ${SITE_NAME}`,
  url,
  description: DESCRIPTION,
  isPartOf: {
    "@type": "WebSite",
    name: SITE_NAME,
    url: site,
  },
  about: {
    "@type": "Organization",
    name: SITE_NAME,
    foundingDate: "2012",
    slogan: SITE_TAGLINE,
  },
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HistoirePage />
    </>
  );
}
