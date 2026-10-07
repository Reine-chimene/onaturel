from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Bundle(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bundles"
    __table_args__ = (UniqueConstraint("slug", name="uq_bundles_slug"),)

    slug: Mapped[str] = mapped_column(String(160), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    items = relationship("BundleItem", back_populates="bundle", cascade="all, delete-orphan")
    zone_prices = relationship("BundleZonePrice", back_populates="bundle", cascade="all, delete-orphan")


class BundleItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "bundle_items"
    __table_args__ = (UniqueConstraint("bundle_id", "product_id", name="uq_bundle_item"),)

    bundle_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("bundles.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    bundle = relationship("Bundle", back_populates="items")
    product = relationship("Product")


class BundleZonePrice(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bundle_zone_prices"
    __table_args__ = (
        UniqueConstraint("bundle_id", "zone_id", name="uq_bundle_zone_price"),
    )

    bundle_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("bundles.id", ondelete="CASCADE"),
        nullable=False,
    )
    zone_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("commercial_zones.id", ondelete="CASCADE"),
        nullable=False,
    )
    price_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    promo_price_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    promo_is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    bundle = relationship("Bundle", back_populates="zone_prices")
    zone = relationship("CommercialZone")

    @property
    def selling_price(self) -> int:
        if self.promo_is_active and self.promo_price_amount is not None:
            return self.promo_price_amount
        return self.price_amount
