export const UserRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  SELLER: "SELLER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const FulfillmentMode = {
  DELIVERY: "DELIVERY",
  SHIPPING: "SHIPPING",
  PICKUP: "PICKUP",
} as const;
export type FulfillmentMode = (typeof FulfillmentMode)[keyof typeof FulfillmentMode];

export const FeePolicy = {
  NONE: "NONE",
  DEFAULT: "DEFAULT",
  SET_AT_PROCESSING: "SET_AT_PROCESSING",
} as const;
export type FeePolicy = (typeof FeePolicy)[keyof typeof FeePolicy];

export const OrderStatus = {
  NEW: "NEW",
  CONFIRMED: "CONFIRMED",
  PREPARING: "PREPARING",
  READY: "READY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ProductPaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
} as const;
export type ProductPaymentStatus = (typeof ProductPaymentStatus)[keyof typeof ProductPaymentStatus];

export const FulfillmentPaymentStatus = {
  NOT_APPLICABLE: "NOT_APPLICABLE",
  DUE_ON_FULFILLMENT: "DUE_ON_FULFILLMENT",
  PAID: "PAID",
} as const;
export type FulfillmentPaymentStatus =
  (typeof FulfillmentPaymentStatus)[keyof typeof FulfillmentPaymentStatus];

export const MovementReason = {
  RECEIPT: "RECEIPT",
  SALE: "SALE",
  ORDER_CONFIRMED: "ORDER_CONFIRMED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  ADJUSTMENT: "ADJUSTMENT",
  TRANSFER_OUT: "TRANSFER_OUT",
  TRANSFER_IN: "TRANSFER_IN",
} as const;
export type MovementReason = (typeof MovementReason)[keyof typeof MovementReason];

export const StockStatus = {
  IN_STOCK: "IN_STOCK",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
} as const;
export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus];

export const SalesChannel = {
  STORE: "STORE",
  ONLINE: "ONLINE",
} as const;
export type SalesChannel = (typeof SalesChannel)[keyof typeof SalesChannel];

export const SaleStatus = {
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus];

export const OWNER_ROLES: ReadonlySet<UserRole> = new Set([UserRole.OWNER, UserRole.ADMIN]);

export const CONFIRMED_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
]);
