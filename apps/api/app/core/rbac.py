from app.core.enums import UserRole
from app.core.security import OWNER_ROLES

Permission = str

PERMISSIONS: dict[Permission, frozenset[UserRole]] = {
    "zones:read": frozenset({*UserRole}),
    "zones:write": OWNER_ROLES,
    "users:read": OWNER_ROLES,
    "users:write": OWNER_ROLES,
    "catalog:read": frozenset({*UserRole}),
    "catalog:write": OWNER_ROLES,
    "pricing:write": OWNER_ROLES,
    "inventory:read": frozenset({*UserRole}),
    "inventory:write": OWNER_ROLES,
    "orders:read": frozenset({*UserRole}),
    "orders:write": frozenset({*UserRole}),
    "sales:read": frozenset({*UserRole}),
    "sales:write": frozenset({*UserRole}),
    "pos:use": frozenset({*UserRole}),
    "documents:print": frozenset({*UserRole}),
    "reports:sensitive": OWNER_ROLES,
    "cash:close": frozenset({*UserRole}),
    "cash:read_all": OWNER_ROLES,
    "audit:read": OWNER_ROLES,
    "settings:write": OWNER_ROLES,
    "dashboard:access": OWNER_ROLES,
}


def has_permission(role: UserRole, permission: Permission) -> bool:
    allowed = PERMISSIONS.get(permission)
    if allowed is None:
        return False
    return role in allowed
