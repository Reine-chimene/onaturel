from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Sale(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "sales"
    __table_args__ = (UniqueConstraint("number", name="uq_sales_number"),)

    number: Mapped[str] = mapped_column(String(32), nullable=False)
    zone_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("commercial_zones.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    currency_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("currencies.id", ondelete="RESTRICT"),
        nullable=False,
    )
    currency_code: Mapped[str] = mapped_column(String(8), nullable=False)
    seller_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="COMPLETED")
    products_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fulfillment_fee_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    payment_method: Mapped[str] = mapped_column(String(32), nullable=False)
    amount_paid: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    amount_remaining: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    customer_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    zone = relationship("CommercialZone")
    currency = relationship("Currency")
    seller = relationship("User")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "sale_items"

    sale_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )
    bundle_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("bundles.id", ondelete="SET NULL"),
        nullable=True,
    )
    name_snapshot: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_price_snapshot: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    line_total: Mapped[int] = mapped_column(Integer, nullable=False)

    sale = relationship("Sale", back_populates="items")


class Payment(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "payments"

    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    order_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    sale_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("currencies.id", ondelete="RESTRICT"),
        nullable=False,
    )
    method: Mapped[str] = mapped_column(String(32), nullable=False)
    recorded_by_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )


class Document(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "documents"
    __table_args__ = (UniqueConstraint("number", name="uq_documents_number"),)

    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    number: Mapped[str] = mapped_column(String(32), nullable=False)
    sale_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="SET NULL"),
        nullable=True,
    )
    order_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
    )
    zone_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("commercial_zones.id", ondelete="RESTRICT"),
        nullable=False,
    )
    currency_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("currencies.id", ondelete="RESTRICT"),
        nullable=False,
    )
    issued_by_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class CashClosure(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "cash_closures"
    __table_args__ = (
        UniqueConstraint("seller_id", "zone_id", "business_date", name="uq_cash_closure_day"),
    )

    seller_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    zone_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("commercial_zones.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    currency_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("currencies.id", ondelete="RESTRICT"),
        nullable=False,
    )
    business_date: Mapped[date] = mapped_column(Date, nullable=False)
    cash_expected: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mobile_money_expected: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    other_expected: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_expected: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sales_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    closed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
