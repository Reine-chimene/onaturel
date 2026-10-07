import { API_URL as API } from "@/lib/apiUrl";

export type PublicCategory = {
  slug: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
};

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  is_new: boolean;
  is_featured: boolean;
  price: number;
  promo_price: number | null;
  promo_active: boolean;
  currency_code: "XAF" | "EUR";
  stock_status: string;
  available: boolean;
  category_slug: string | null;
  category_name: string | null;
  image_url: string | null;
};

export type PublicProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_new: boolean;
  category_slug: string | null;
  category_name: string | null;
  images: string[];
  offered: boolean;
  available: boolean;
  qty: number;
  stock_status: string;
  price: number | null;
  promo_price: number | null;
  promo_active: boolean;
  currency_code: "XAF" | "EUR";
  related: PublicProduct[];
};

export type PublicPack = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  promo_price: number | null;
  promo_active: boolean;
  currency_code: "XAF" | "EUR";
  available: boolean;
  available_qty: number;
  image_url?: string | null;
};

export type PublicShop = {
  zone_slug: string;
  zone_name: string;
  currency_code: "XAF" | "EUR";
  categories: PublicCategory[];
  products: PublicProduct[];
  packs: PublicPack[];
};

export async function fetchShop(zone: string, category?: string | null): Promise<PublicShop | null> {
  try {
    const params = new URLSearchParams({ zone });
    if (category) params.set("category", category);
    const response = await fetch(`${API}/api/v1/public/shop?${params}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as PublicShop;
  } catch {
    return null;
  }
}

export async function fetchShopOrThrow(zone: string, category?: string | null): Promise<PublicShop> {
  const params = new URLSearchParams({ zone });
  if (category) params.set("category", category);
  const response = await fetch(`${API}/api/v1/public/shop?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Catalogue indisponible (${response.status})`);
  }
  return (await response.json()) as PublicShop;
}

export async function fetchPublicProduct(
  slug: string,
  zone: string,
): Promise<PublicProductDetail | "not-found"> {
  const response = await fetch(
    `${API}/api/v1/public/products/${encodeURIComponent(slug)}?zone=${encodeURIComponent(zone)}`,
    { cache: "no-store", signal: AbortSignal.timeout(8000) },
  );
  if (response.status === 404) return "not-found";
  if (!response.ok) throw new Error(`Fiche indisponible (${response.status})`);
  return (await response.json()) as PublicProductDetail;
}

export async function fetchPublicProductSafe(
  slug: string,
  zone: string,
): Promise<PublicProductDetail | "not-found" | "error"> {
  try {
    return await fetchPublicProduct(slug, zone);
  } catch {
    return "error";
  }
}
