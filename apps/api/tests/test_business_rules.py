from app.core.enums import OrderStatus, StockStatus, UserRole
from app.core.money import assert_same_currency, convert, format_amount
from app.core.rbac import has_permission
from app.core.security import is_owner_role
from app.services.inventory import stock_status
from app.services.orders import order_counts_in_revenue
from app.services.reporting import assert_no_mixed_total

import pytest
from fastapi import HTTPException


def test_stock_status_rules() -> None:
    assert stock_status(0, 5) is StockStatus.OUT_OF_STOCK
    assert stock_status(3, 5) is StockStatus.LOW_STOCK
    assert stock_status(12, 5) is StockStatus.IN_STOCK


def test_no_automatic_conversion() -> None:
    with pytest.raises(HTTPException) as exc:
        convert(8000, "XAF", "EUR")
    assert exc.value.status_code == 400


def test_same_currency_guard() -> None:
    assert_same_currency("XAF", "XAF")
    with pytest.raises(HTTPException):
        assert_same_currency("XAF", "EUR")


def test_format_xaf_and_eur() -> None:
    assert "XAF" in format_amount(8000, "XAF", 0)
    assert format_amount(1500, "EUR", 2).startswith("15,00")


def test_owner_and_admin_share_permissions() -> None:
    assert is_owner_role(UserRole.OWNER)
    assert is_owner_role(UserRole.ADMIN)
    assert not is_owner_role(UserRole.SELLER)
    assert has_permission(UserRole.OWNER, "reports:sensitive")
    assert has_permission(UserRole.ADMIN, "pricing:write")
    assert not has_permission(UserRole.SELLER, "pricing:write")
    assert not has_permission(UserRole.SELLER, "reports:sensitive")
    assert has_permission(UserRole.SELLER, "pos:use")
    assert has_permission(UserRole.SELLER, "sales:write")


def test_cancelled_orders_excluded_from_revenue() -> None:
    assert order_counts_in_revenue(OrderStatus.CONFIRMED.value)
    assert not order_counts_in_revenue(OrderStatus.NEW.value)
    assert not order_counts_in_revenue(OrderStatus.CANCELLED.value)


def test_revenue_rows_cannot_be_summed_across_currencies() -> None:
    rows = [
        {"currency_code": "XAF", "products_amount": 8000},
        {"currency_code": "EUR", "products_amount": 1500},
    ]
    with pytest.raises(HTTPException) as exc:
        assert_no_mixed_total(rows)
    assert exc.value.status_code == 400
