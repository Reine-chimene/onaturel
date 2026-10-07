import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import {
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_TITLE,
  getSiteUrl,
} from "@/lib/seo";

const site = getSiteUrl();

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_NAME,
    description: SITE_TAGLINE,
    locale: SITE_LOCALE,
    type: "website",
    url: site,
    images: [{ url: OG_IMAGE, width: 768, height: 1024, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_TAGLINE,
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: site,
  description: SITE_TAGLINE,
  foundingDate: "2012",
  slogan: SITE_TAGLINE,
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomePage />
    </>
  );
}
