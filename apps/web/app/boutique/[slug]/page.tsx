import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ProductPage } from "@/components/product/ProductPage";
import { fetchPublicProductSafe, type PublicProductDetail } from "@/lib/catalog";
import { schemaPrice, type CurrencyCode } from "@/lib/money";
import { SITE_LOCALE, SITE_NAME, getSiteUrl } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

function zoneFromCookie(value: string | undefined) {
  return value === "europe" ? "europe" : "cameroun";
}

function metaDescription(product: PublicProductDetail) {
  if (product.description) {
    const compact = product.description.replace(/\s+/g, " ").trim();
    return compact.length > 180 ? `${compact.slice(0, 177)}…` : compact;
  }
  return [product.name, product.category_name, SITE_NAME].filter(Boolean).join(" — ");
}

function ProductJsonLd({ product }: { product: PublicProductDetail }) {
  const url = `${getSiteUrl()}/boutique/${product.slug}`;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
  };
  if (product.description) data.description = product.description;
  if (product.images.length > 0) data.image = product.images;
  if (product.price != null) {
    const amount =
      product.promo_active && product.promo_price != null ? product.promo_price : product.price;
    data.offers = {
      "@type": "Offer",
      url,
      priceCurrency: product.currency_code,
      price: schemaPrice(amount, product.currency_code as CurrencyCode),
      availability: product.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    };
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const jar = await cookies();
  const zone = zoneFromCookie(jar.get("on-zone")?.value);
  const product = await fetchPublicProductSafe(slug, zone);
  const site = getSiteUrl();

  if (product === "not-found") {
    return {
      title: "Produit introuvable",
      robots: { index: false, follow: true },
      alternates: { canonical: `/boutique/${slug}` },
    };
  }

  if (product === "error") {
    return {
      title: "Boutique",
      alternates: { canonical: `/boutique/${slug}` },
    };
  }

  const description = metaDescription(product);
  const url = `${site}/boutique/${product.slug}`;
  const image = product.images[0];

  return {
    title: product.name,
    description,
    alternates: { canonical: `/boutique/${product.slug}` },
    openGraph: {
      title: `${product.name} · ${SITE_NAME}`,
      description,
      locale: SITE_LOCALE,
      type: "website",
      url,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${product.name} · ${SITE_NAME}`,
      description,
      ...(image ? { images: [image] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const jar = await cookies();
  const zone = zoneFromCookie(jar.get("on-zone")?.value);
  const product = await fetchPublicProductSafe(slug, zone);

  return (
    <>
      {typeof product === "object" ? <ProductJsonLd product={product} /> : null}
      <ProductPage slug={slug} />
    </>
  );
}
