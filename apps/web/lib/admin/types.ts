export type CurrencyCode = "XAF" | "EUR";

export type ZoneOut = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  currency: {
    id: string;
    code: CurrencyCode;
    name: string;
    symbol: string;
    minor_units: number;
  };
  fulfillment_modes: {
    id: string;
    mode: "DELIVERY" | "SHIPPING" | "PICKUP";
    label: string;
    is_enabled: boolean;
    fee_policy: string;
    default_fee_amount: number | null;
  }[];
};

export type ZonePriceRow = {
  zone_id: string;
  zone_slug: string;
  zone_name: string;
  currency_code: CurrencyCode;
  price_amount: number | null;
  promo_price_amount: number | null;
  promo_is_active: boolean;
  selling_price: number | null;
  is_available: boolean;
  stock: number;
  stock_status: string;
  low_stock_threshold: number | null;
};

export type ProductImageOut = {
  id: string;
  file_id: string;
  url: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type ProductAdmin = {
  id: string;
  sku: string | null;
  slug: string;
  name: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  is_new: boolean;
  is_featured: boolean;
  is_active: boolean;
  is_archived: boolean;
  image_url: string | null;
  images: ProductImageOut[];
  zones: ZonePriceRow[];
};

export type CategoryAdmin = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  image_file_id: string | null;
  image_url: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type OrderAdmin = {
  id: string;
  number: string;
  created_at: string;
  zone_id: string;
  zone_name: string | null;
  zone_slug: string | null;
  currency_code: CurrencyCode;
  status: string;
  customer_name: string;
  customer_phone: string;
  city: string | null;
  neighborhood: string | null;
  fulfillment_mode: string;
  products_amount: number;
  fulfillment_fee_amount: number;
  products_payment_status: string;
  fulfillment_payment_status: string;
  notes: string | null;
  items_summary: string;
  items_count: number;
  items?: {
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
  stock_decremented?: boolean;
  total_due?: number;
};

export type RevenueRow = {
  zone: string;
  currency_code: CurrencyCode;
  channel: string;
  products_amount: number;
  fulfillment_fees_paid: number;
  count: number;
};

export type Overview = {
  greeting: string;
  orders: {
    new: number;
    to_process: number;
    confirmed: number;
    cancelled: number;
    by_status: Record<string, number>;
    today: number;
  };
  products_sold: number;
  out_of_stock: number;
  low_stock: number;
  active_promotions: number;
  revenue: RevenueRow[];
  recent_orders: {
    id: string;
    number: string;
    created_at: string;
    zone_name: string | null;
    currency_code: CurrencyCode;
    products_amount: number;
    status: string;
    items_summary: string;
  }[];
  top_products: {
    zone: string;
    currency_code: CurrencyCode;
    product_id: string | null;
    name: string;
    quantity: number;
    amount: number;
  }[];
  note: string;
};

export type PromotionAdmin = {
  id: string;
  product_id: string | null;
  bundle_id: string | null;
  product_name: string | null;
  bundle_name: string | null;
  zone_id: string;
  promo_price_amount: number;
  is_active: boolean;
  is_live: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export type PackAdmin = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_file_id: string | null;
  image_url: string | null;
  is_active: boolean;
  is_archived: boolean;
  items: { product_id: string; product_name: string | null; quantity: number }[];
  zones: {
    zone_id: string;
    zone_slug: string;
    zone_name: string;
    currency_code: CurrencyCode;
    price_amount: number | null;
    promo_is_active: boolean;
    selling_price: number | null;
    is_available: boolean;
    buildable_qty: number;
    available: boolean;
  }[];
};

export type Me = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  assigned_zone_id: string | null;
  is_active: boolean;
};
