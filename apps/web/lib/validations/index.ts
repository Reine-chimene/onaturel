import { z } from "zod";
import { FeePolicy, FulfillmentMode, FulfillmentPaymentStatus, OrderStatus, ProductPaymentStatus, UserRole } from "@/types/enums";

export const uuidSchema = z.string().uuid();

export const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6),
});

const userRoles = [UserRole.OWNER, UserRole.ADMIN, UserRole.SELLER] as const;
const orderStatuses = [
  OrderStatus.NEW,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
] as const;
const feePolicies = [FeePolicy.NONE, FeePolicy.DEFAULT, FeePolicy.SET_AT_PROCESSING] as const;

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  full_name: z.string().min(1),
  role: z.enum(userRoles),
  assigned_zone_id: uuidSchema.nullable().optional(),
});

export const assignZoneSchema = z.object({
  assigned_zone_id: uuidSchema,
});

export const categoryWriteSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional().nullable(),
  description: z.string().nullable().optional(),
  parent_id: uuidSchema.nullable().optional(),
  image_file_id: uuidSchema.nullable().optional(),
  sort_order: z.number().int().optional(),
  is_visible: z.boolean().optional(),
});

export const categoryPatchSchema = categoryWriteSchema.partial();

export const zonePriceInSchema = z.object({
  zone_id: uuidSchema,
  price_amount: z.number().int().nullable().optional(),
  is_available: z.boolean().nullable().optional(),
});

export const zoneStockInSchema = z.object({
  zone_id: uuidSchema,
  qty: z.number().int().min(0),
});

export const productWriteSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  description: z.string().nullable().optional(),
  category_id: uuidSchema.nullable().optional(),
  is_new: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
  prices: z.array(zonePriceInSchema).optional(),
  stocks: z.array(zoneStockInSchema).optional(),
});

export const productPatchSchema = productWriteSchema.extend({
  is_archived: z.boolean().optional(),
}).partial();

export const imageOrderSchema = z.array(
  z.object({
    id: uuidSchema,
    sort_order: z.number().int(),
    is_primary: z.boolean().optional(),
  }),
);

export const packItemInSchema = z.object({
  product_id: uuidSchema,
  quantity: z.number().int().min(1),
});

export const packPriceInSchema = z.object({
  zone_id: uuidSchema,
  price_amount: z.number().int().nullable().optional(),
  is_available: z.boolean().nullable().optional(),
});

export const packWriteSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional().nullable(),
  description: z.string().nullable().optional(),
  image_file_id: uuidSchema.nullable().optional(),
  is_active: z.boolean().optional(),
  items: z.array(packItemInSchema).optional(),
  prices: z.array(packPriceInSchema).optional(),
});

export const packPatchSchema = packWriteSchema.extend({
  is_archived: z.boolean().optional(),
}).partial();

export const promotionWriteSchema = z
  .object({
    product_id: uuidSchema.nullable().optional(),
    bundle_id: uuidSchema.nullable().optional(),
    zone_id: uuidSchema,
    promo_price_amount: z.number().int(),
    is_active: z.boolean().optional(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (Boolean(data.product_id) === Boolean(data.bundle_id)) {
      ctx.addIssue({ code: "custom", message: "Indiquez un produit ou un pack, pas les deux." });
    }
    if (data.promo_price_amount <= 0) {
      ctx.addIssue({ code: "custom", message: "Le prix promotionnel doit être supérieur à zéro." });
    }
  });

export const promotionPatchSchema = z.object({
  promo_price_amount: z.number().int().optional(),
  is_active: z.boolean().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  zone_id: uuidSchema.optional(),
});

export const transferSchema = z.object({
  product_id: uuidSchema,
  from_zone_id: uuidSchema,
  to_zone_id: uuidSchema,
  quantity: z.number().int(),
  note: z.string().nullable().optional(),
});

export const adjustSchema = z.object({
  product_id: uuidSchema,
  zone_id: uuidSchema,
  qty: z.number().int(),
  note: z.string().nullable().optional(),
});

export const thresholdSchema = z.object({
  product_id: uuidSchema,
  zone_id: uuidSchema,
  low_stock_threshold: z.number().int().nullable(),
});

export const orderStatusSchema = z.object({
  status: z.enum(orderStatuses),
});

export const productsPaymentSchema = z.object({
  products_payment_status: z.enum([ProductPaymentStatus.PENDING, ProductPaymentStatus.PAID]),
});

export const fulfillmentPaymentSchema = z.object({
  fulfillment_payment_status: z.enum([
    FulfillmentPaymentStatus.NOT_APPLICABLE,
    FulfillmentPaymentStatus.DUE_ON_FULFILLMENT,
    FulfillmentPaymentStatus.PAID,
  ]),
});

export const fulfillmentFeeSchema = z.object({
  fulfillment_fee_amount: z.number().int(),
});

export const zoneUpdateSchema = z.object({
  is_active: z.boolean().optional(),
  name: z.string().optional(),
  sort_order: z.number().int().optional(),
});

export const fulfillmentUpdateSchema = z.object({
  is_enabled: z.boolean().optional(),
  label: z.string().optional(),
  fee_policy: z.enum(feePolicies).optional(),
  default_fee_amount: z.number().int().nullable().optional(),
});

export const settingPatchSchema = z.object({
  key: z.string().min(1),
  value: z.record(z.any()),
});

export const contentPatchSchema = z.object({
  section: z.enum(["contact", "footer", "home", "histoire", "boutique", "seo"]),
  value: z.record(z.any()),
});

export const cartItemSchema = z.object({
  product_id: z.string().optional().nullable(),
  bundle_id: z.string().optional().nullable(),
  quantity: z.number().int(),
});

export const quoteSchema = z.object({
  zone: z.string().min(2).max(64),
  items: z.array(cartItemSchema),
});

export const publicOrderCreateSchema = quoteSchema.extend({
  fulfillment_mode: z.string().min(1),
  customer_name: z.string(),
  customer_phone: z.string(),
  city: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
});

export { FulfillmentMode };
