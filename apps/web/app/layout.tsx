import type { ReactNode } from "react";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Cormorant_Garamond, Figtree } from "next/font/google";
import { getSiteContent } from "@/lib/services/site-content.service";
import { getSiteUrl } from "@/lib/seo";
import "@/styles/tokens.css";
import "@/styles/reset.css";
import "@/styles/system.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display-family",
  display: "swap",
});

const ui = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui-family",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const content = await getSiteContent();
    const ogUrl = content.seo.og_image.url ?? "/images/hero.jpg";
    return {
      metadataBase: new URL(getSiteUrl()),
      title: {
        default: content.seo.title,
        template: `%s · O’Naturelle`,
      },
      description: content.seo.description,
      openGraph: {
        title: content.seo.title,
        description: content.seo.description,
        images: ogUrl ? [{ url: ogUrl }] : undefined,
      },
    };
  } catch {
    return {
      metadataBase: new URL(getSiteUrl()),
      title: { default: "O’Naturelle", template: `%s · O’Naturelle` },
    };
  }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${ui.variable}`}>
      <body>
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  );
}
