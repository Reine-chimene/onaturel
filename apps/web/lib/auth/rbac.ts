import { OWNER_ROLES, UserRole } from "@/types/enums";

export type Permission =
  | "zones:read"
  | "zones:write"
  | "users:read"
  | "users:write"
  | "catalog:read"
  | "catalog:write"
  | "pricing:write"
  | "inventory:read"
  | "inventory:write"
  | "orders:read"
  | "orders:write"
  | "sales:read"
  | "sales:write"
  | "pos:use"
  | "documents:print"
  | "reports:sensitive"
  | "cash:close"
  | "cash:read_all"
  | "audit:read"
  | "settings:write"
  | "dashboard:access";

const ALL_ROLES = new Set<UserRole>([UserRole.OWNER, UserRole.ADMIN, UserRole.SELLER]);

const PERMISSIONS: Record<Permission, ReadonlySet<UserRole>> = {
  "zones:read": ALL_ROLES,
  "zones:write": OWNER_ROLES,
  "users:read": OWNER_ROLES,
  "users:write": OWNER_ROLES,
  "catalog:read": ALL_ROLES,
  "catalog:write": OWNER_ROLES,
  "pricing:write": OWNER_ROLES,
  "inventory:read": ALL_ROLES,
  "inventory:write": OWNER_ROLES,
  "orders:read": ALL_ROLES,
  "orders:write": ALL_ROLES,
  "sales:read": ALL_ROLES,
  "sales:write": ALL_ROLES,
  "pos:use": ALL_ROLES,
  "documents:print": ALL_ROLES,
  "reports:sensitive": OWNER_ROLES,
  "cash:close": ALL_ROLES,
  "cash:read_all": OWNER_ROLES,
  "audit:read": OWNER_ROLES,
  "settings:write": OWNER_ROLES,
  "dashboard:access": OWNER_ROLES,
};

export function isOwnerRole(role: string): boolean {
  return OWNER_ROLES.has(role as UserRole);
}

export function hasPermission(role: string, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.has(role as UserRole);
}
