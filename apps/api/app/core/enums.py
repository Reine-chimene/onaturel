from enum import StrEnum


class UserRole(StrEnum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    SELLER = "SELLER"


class FulfillmentMode(StrEnum):
    DELIVERY = "DELIVERY"
    SHIPPING = "SHIPPING"
    PICKUP = "PICKUP"


class FeePolicy(StrEnum):
    NONE = "NONE"
    DEFAULT = "DEFAULT"
    SET_AT_PROCESSING = "SET_AT_PROCESSING"


class OrderStatus(StrEnum):
    NEW = "NEW"
    CONFIRMED = "CONFIRMED"
    PREPARING = "PREPARING"
    READY = "READY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class ProductPaymentStatus(StrEnum):
    PENDING = "PENDING"
    PAID = "PAID"


class FulfillmentPaymentStatus(StrEnum):
    NOT_APPLICABLE = "NOT_APPLICABLE"
    DUE_ON_FULFILLMENT = "DUE_ON_FULFILLMENT"
    PAID = "PAID"


class PaymentKind(StrEnum):
    ORDER_PRODUCTS = "ORDER_PRODUCTS"
    ORDER_FULFILLMENT = "ORDER_FULFILLMENT"
    SALE = "SALE"


class PaymentMethod(StrEnum):
    CASH = "CASH"
    MOBILE_MONEY = "MOBILE_MONEY"
    OTHER = "OTHER"


class MovementReason(StrEnum):
    RECEIPT = "RECEIPT"
    SALE = "SALE"
    ORDER_CONFIRMED = "ORDER_CONFIRMED"
    ORDER_CANCELLED = "ORDER_CANCELLED"
    ADJUSTMENT = "ADJUSTMENT"
    TRANSFER_OUT = "TRANSFER_OUT"
    TRANSFER_IN = "TRANSFER_IN"


class DocumentKind(StrEnum):
    RECEIPT = "RECEIPT"
    INVOICE = "INVOICE"


class SaleStatus(StrEnum):
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class SalesChannel(StrEnum):
    STORE = "STORE"
    ONLINE = "ONLINE"


class StockStatus(StrEnum):
    IN_STOCK = "IN_STOCK"
    LOW_STOCK = "LOW_STOCK"
    OUT_OF_STOCK = "OUT_OF_STOCK"
