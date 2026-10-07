from app.core.enums import FeePolicy, FulfillmentMode, FulfillmentPaymentStatus, OrderStatus
from app.models.zones import ZoneFulfillmentMode
from app.services.checkout import (
    fulfillment_on_create,
    normalize_phone,
    validate_address,
    validate_name,
    validate_phone,
)
from app.services.orders import order_counts_in_revenue
from app.services.pricing import pack_buildable_qty

import pytest
from fastapi import HTTPException


def _mode(mode: str, policy: str, amount: int | None = None, enabled: bool = True) -> ZoneFulfillmentMode:
    return ZoneFulfillmentMode(
        mode=mode,
        label=mode,
        is_enabled=enabled,
        fee_policy=policy,
        default_fee_amount=amount,
    )


def test_pack_cannot_be_built_if_a_component_is_missing() -> None:
    assert pack_buildable_qty([]) == 0
    assert pack_buildable_qty([(1, 0), (2, 10)]) == 0
    assert pack_buildable_qty([(1, 3), (2, 4)]) == 2
    assert pack_buildable_qty([(2, 5)]) == 2


def test_phone_and_name_validation() -> None:
    assert validate_phone("673 980 711") == "673980711"
    assert validate_phone("+237 673 980 711") == "+237673980711"
    assert validate_name("  Marie  Ngono ") == "Marie Ngono"
    with pytest.raises(HTTPException):
        validate_phone("12")
    with pytest.raises(HTTPException):
        validate_name(" ")


def test_normalize_phone_strips_00_prefix() -> None:
    assert normalize_phone("00237673980711") == "+237673980711"


def test_delivery_requires_neighborhood_shipping_requires_city() -> None:
    city, neighborhood = validate_address(FulfillmentMode.DELIVERY.value, city=None, neighborhood="Bonapriso")
    assert neighborhood == "Bonapriso" and city is None
    city, neighborhood = validate_address(FulfillmentMode.SHIPPING.value, city="Paris", neighborhood=None)
    assert city == "Paris" and neighborhood is None
    city, neighborhood = validate_address(FulfillmentMode.PICKUP.value, city="x", neighborhood="y")
    assert city is None and neighborhood is None
    with pytest.raises(HTTPException) as delivery:
        validate_address(FulfillmentMode.DELIVERY.value, city="Douala", neighborhood="")
    assert "quartier" in delivery.value.detail
    with pytest.raises(HTTPException) as shipping:
        validate_address(FulfillmentMode.SHIPPING.value, city="", neighborhood="x")
    assert "ville" in shipping.value.detail


def test_fulfillment_fees_never_marked_paid_on_create() -> None:
    amount, pay_status, known = fulfillment_on_create(
        _mode(FulfillmentMode.DELIVERY.value, FeePolicy.SET_AT_PROCESSING.value)
    )
    assert amount == 0
    assert known is False
    assert pay_status == FulfillmentPaymentStatus.DUE_ON_FULFILLMENT.value

    amount, pay_status, known = fulfillment_on_create(
        _mode(FulfillmentMode.SHIPPING.value, FeePolicy.DEFAULT.value, 2500)
    )
    assert amount == 2500
    assert known is True
    assert pay_status == FulfillmentPaymentStatus.DUE_ON_FULFILLMENT.value

    amount, pay_status, known = fulfillment_on_create(
        _mode(FulfillmentMode.PICKUP.value, FeePolicy.DEFAULT.value, 1000)
    )
    assert amount == 0
    assert pay_status == FulfillmentPaymentStatus.NOT_APPLICABLE.value


def test_new_and_cancelled_orders_are_excluded_from_revenue() -> None:
    assert not order_counts_in_revenue(OrderStatus.NEW.value)
    assert not order_counts_in_revenue(OrderStatus.CANCELLED.value)
    assert order_counts_in_revenue(OrderStatus.CONFIRMED.value)
