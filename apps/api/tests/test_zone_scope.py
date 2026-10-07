from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.core.deps import assert_zone_scope
from app.core.enums import UserRole
from app.models.identity import User


def _user(role: UserRole, zone_id=None) -> User:
    return User(
        email="test@onaturelle.local",
        hashed_password="x",
        full_name="Test",
        role=role.value,
        assigned_zone_id=zone_id,
        is_active=True,
    )


def test_seller_locked_to_assigned_zone() -> None:
    zone_a = uuid4()
    zone_b = uuid4()
    seller = _user(UserRole.SELLER, zone_a)
    assert_zone_scope(seller, zone_a)
    with pytest.raises(HTTPException) as exc:
        assert_zone_scope(seller, zone_b)
    assert exc.value.status_code == 403


def test_owner_can_access_any_zone() -> None:
    owner = _user(UserRole.OWNER)
    assert_zone_scope(owner, uuid4())
