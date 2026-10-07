from datetime import datetime, timedelta, timezone

from app.core.enums import OrderStatus, UserRole
from app.core.rbac import has_permission
from app.core.security import is_owner_role
from app.services.orders_admin import ALLOWED_TRANSITIONS
from app.services.promotions import promotion_is_live
from app.models.catalog import Promotion


def test_dashboard_is_owner_only() -> None:
    assert has_permission(UserRole.OWNER, "dashboard:access")
    assert has_permission(UserRole.ADMIN, "dashboard:access")
    assert not has_permission(UserRole.SELLER, "dashboard:access")
    assert not has_permission(UserRole.SELLER, "catalog:write")
    assert not has_permission(UserRole.SELLER, "pricing:write")
    assert not has_permission(UserRole.SELLER, "inventory:write")
    assert not has_permission(UserRole.SELLER, "zones:write")
    assert not has_permission(UserRole.SELLER, "settings:write")
    assert is_owner_role(UserRole.OWNER)
    assert not is_owner_role(UserRole.SELLER)


def test_order_transitions_new_only_confirm_or_cancel() -> None:
    assert OrderStatus.CONFIRMED in ALLOWED_TRANSITIONS[OrderStatus.NEW]
    assert OrderStatus.CANCELLED in ALLOWED_TRANSITIONS[OrderStatus.NEW]
    assert OrderStatus.DELIVERED not in ALLOWED_TRANSITIONS[OrderStatus.NEW]
    assert ALLOWED_TRANSITIONS[OrderStatus.CANCELLED] == frozenset()
    assert ALLOWED_TRANSITIONS[OrderStatus.DELIVERED] == frozenset()


def test_promotion_live_is_zone_record_not_global() -> None:
    now = datetime.now(timezone.utc)
    live = Promotion(
        promo_price_amount=5000,
        is_active=True,
        starts_at=now - timedelta(days=1),
        ends_at=now + timedelta(days=1),
    )
    future = Promotion(
        promo_price_amount=5000,
        is_active=True,
        starts_at=now + timedelta(days=2),
        ends_at=now + timedelta(days=10),
    )
    inactive = Promotion(promo_price_amount=5000, is_active=False)
    assert promotion_is_live(live, now)
    assert not promotion_is_live(future, now)
    assert not promotion_is_live(inactive, now)
