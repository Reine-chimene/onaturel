import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
import { hasPermission, isOwnerRole } from "@/lib/auth/rbac";
import { ALLOWED_TRANSITIONS, orderCountsInRevenue } from "@/lib/services/orders.service";
import { packBuildableQty } from "@/lib/services/pricing.service";
import { promotionIsLive } from "@/lib/services/promotions.service";
import { stockStatus } from "@/lib/services/inventory.service";
import {
  fulfillmentOnCreate,
  normalizePhone,
  validateAddress,
  validateName,
  validatePhone,
} from "@/lib/services/checkout.service";
import { assertNoMixedTotal, convert, formatAmount } from "@/lib/utils/money";
import { ApiError } from "@/lib/utils/errors";
import {
  FeePolicy,
  FulfillmentMode,
  FulfillmentPaymentStatus,
  OrderStatus,
  StockStatus,
  UserRole,
} from "@/types/enums";

describe("stock status", () => {
  it("maps qty against threshold", () => {
    expect(stockStatus(0, 5)).toBe(StockStatus.OUT_OF_STOCK);
    expect(stockStatus(3, 5)).toBe(StockStatus.LOW_STOCK);
    expect(stockStatus(12, 5)).toBe(StockStatus.IN_STOCK);
  });
});

describe("money", () => {
  it("forbids automatic conversion", () => {
    expect(() => convert(8000, "XAF", "EUR")).toThrow(ApiError);
  });
  it("forbids mixed totals", () => {
    expect(() =>
      assertNoMixedTotal([
        { currency_code: "XAF" },
        { currency_code: "EUR" },
      ]),
    ).toThrow(ApiError);
  });
  it("formats EUR with minors", () => {
    expect(formatAmount(1500, "EUR", 2).startsWith("15,00")).toBe(true);
  });
});

describe("rbac", () => {
  it("shares owner permissions with admin", () => {
    expect(isOwnerRole(UserRole.OWNER)).toBe(true);
    expect(isOwnerRole(UserRole.ADMIN)).toBe(true);
    expect(isOwnerRole(UserRole.SELLER)).toBe(false);
    expect(hasPermission(UserRole.OWNER, "reports:sensitive")).toBe(true);
    expect(hasPermission(UserRole.SELLER, "pricing:write")).toBe(false);
    expect(hasPermission(UserRole.SELLER, "pos:use")).toBe(true);
    expect(hasPermission(UserRole.SELLER, "dashboard:access")).toBe(false);
  });
});

describe("checkout rules", () => {
  it("builds packs from component stock", () => {
    expect(packBuildableQty([])).toBe(0);
    expect(packBuildableQty([[1, 0], [2, 10]])).toBe(0);
    expect(packBuildableQty([[1, 3], [2, 4]])).toBe(2);
    expect(packBuildableQty([[2, 5]])).toBe(2);
  });

  it("validates phone and name", () => {
    expect(validatePhone("673 980 711")).toBe("673980711");
    expect(validatePhone("+237 673 980 711")).toBe("+237673980711");
    expect(normalizePhone("00237673980711")).toBe("+237673980711");
    expect(validateName("  Marie  Ngono ")).toBe("Marie Ngono");
    expect(() => validatePhone("12")).toThrow(ApiError);
    expect(() => validateName(" ")).toThrow(ApiError);
  });

  it("requires neighborhood for delivery and city for shipping", () => {
    expect(validateAddress(FulfillmentMode.DELIVERY, null, "Bonapriso")).toEqual([null, "Bonapriso"]);
    expect(validateAddress(FulfillmentMode.SHIPPING, "Paris", null)).toEqual(["Paris", null]);
    expect(validateAddress(FulfillmentMode.PICKUP, "x", "y")).toEqual([null, null]);
    expect(() => validateAddress(FulfillmentMode.DELIVERY, "Douala", "")).toThrow(/quartier/);
  });

  it("never marks fulfillment paid on create", () => {
    const processing = fulfillmentOnCreate({
      mode: FulfillmentMode.DELIVERY,
      fee_policy: FeePolicy.SET_AT_PROCESSING,
      default_fee_amount: null,
    } as never);
    expect(processing).toEqual([0, FulfillmentPaymentStatus.DUE_ON_FULFILLMENT, false]);

    const withDefault = fulfillmentOnCreate({
      mode: FulfillmentMode.SHIPPING,
      fee_policy: FeePolicy.DEFAULT,
      default_fee_amount: 2500,
    } as never);
    expect(withDefault).toEqual([2500, FulfillmentPaymentStatus.DUE_ON_FULFILLMENT, true]);

    const pickup = fulfillmentOnCreate({
      mode: FulfillmentMode.PICKUP,
      fee_policy: FeePolicy.DEFAULT,
      default_fee_amount: 1000,
    } as never);
    expect(pickup[0]).toBe(0);
    expect(pickup[1]).toBe(FulfillmentPaymentStatus.NOT_APPLICABLE);
  });
});

describe("orders", () => {
  it("excludes new and cancelled from revenue", () => {
    expect(orderCountsInRevenue(OrderStatus.NEW)).toBe(false);
    expect(orderCountsInRevenue(OrderStatus.CANCELLED)).toBe(false);
    expect(orderCountsInRevenue(OrderStatus.CONFIRMED)).toBe(true);
  });

  it("restricts NEW transitions", () => {
    expect(ALLOWED_TRANSITIONS[OrderStatus.NEW].has(OrderStatus.CONFIRMED)).toBe(true);
    expect(ALLOWED_TRANSITIONS[OrderStatus.NEW].has(OrderStatus.DELIVERED)).toBe(false);
    expect(ALLOWED_TRANSITIONS[OrderStatus.CANCELLED].size).toBe(0);
  });
});

describe("promotions", () => {
  it("is live only inside the window", () => {
    const now = new Date("2026-08-22T00:00:00Z");
    expect(
      promotionIsLive(
        { is_active: true, starts_at: new Date("2026-08-21T00:00:00Z"), ends_at: new Date("2026-08-23T00:00:00Z") },
        now,
      ),
    ).toBe(true);
    expect(
      promotionIsLive(
        { is_active: true, starts_at: new Date("2026-08-24T00:00:00Z"), ends_at: new Date("2026-08-30T00:00:00Z") },
        now,
      ),
    ).toBe(false);
    expect(promotionIsLive({ is_active: false, starts_at: null, ends_at: null }, now)).toBe(false);
  });
});
