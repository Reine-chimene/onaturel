from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Currency(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "currencies"
    __table_args__ = (UniqueConstraint("code", name="uq_currencies_code"),)

    code: Mapped[str] = mapped_column(String(8), nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    symbol: Mapped[str] = mapped_column(String(16), nullable=False)
    minor_units: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    zones = relationship("CommercialZone", back_populates="currency")


class CommercialZone(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "commercial_zones"
    __table_args__ = (UniqueConstraint("slug", name="uq_commercial_zones_slug"),)

    slug: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    currency_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("currencies.id", ondelete="RESTRICT"),
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    currency = relationship("Currency", back_populates="zones")
    fulfillment_modes = relationship(
        "ZoneFulfillmentMode",
        back_populates="zone",
        cascade="all, delete-orphan",
    )


class ZoneFulfillmentMode(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "zone_fulfillment_modes"
    __table_args__ = (
        UniqueConstraint("zone_id", "mode", name="uq_zone_fulfillment_mode"),
    )

    zone_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("commercial_zones.id", ondelete="CASCADE"),
        nullable=False,
    )
    mode: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str] = mapped_column(String(64), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    fee_policy: Mapped[str] = mapped_column(String(32), nullable=False)
    default_fee_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)

    zone = relationship("CommercialZone", back_populates="fulfillment_modes")
