import { createHash } from "crypto";
import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createAccessToken, createRefreshToken, decodeToken, getRefreshDays } from "@/lib/auth/jwt";
import { hasPermission, isOwnerRole, type Permission } from "@/lib/auth/rbac";
import { forbidden, unauthorized } from "@/lib/utils/errors";
import { UserRole } from "@/types/enums";

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueTokens(user: User) {
  const tokenId = crypto.randomUUID();
  const refresh = await createRefreshToken({ userId: user.id, tokenId });
  const expires = new Date(Date.now() + getRefreshDays() * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      user_id: user.id,
      token_hash: hashRefreshToken(refresh),
      expires_at: expires,
    },
  });
  const access = await createAccessToken({
    userId: user.id,
    role: user.role as UserRole,
    zoneId: user.assigned_zone_id,
  });
  return {
    access_token: access,
    refresh_token: refresh,
    token_type: "bearer" as const,
    role: user.role,
    assigned_zone_id: user.assigned_zone_id,
  };
}

export async function getCurrentUser(req: Request): Promise<User> {
  const header = req.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (!token || scheme?.toLowerCase() !== "bearer") {
    unauthorized();
  }
  let payload;
  try {
    payload = await decodeToken(token);
  } catch {
    unauthorized("Jeton invalide.");
  }
  if (payload.typ !== "access" || typeof payload.sub !== "string") {
    unauthorized("Jeton d'accès requis.");
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.is_active) unauthorized("Compte inactif.");
  return user;
}

export async function requirePermission(req: Request, permission: Permission): Promise<User> {
  const user = await getCurrentUser(req);
  if (!hasPermission(user.role, permission)) forbidden();
  return user;
}

export async function requireOwner(req: Request): Promise<User> {
  const user = await getCurrentUser(req);
  if (!isOwnerRole(user.role)) {
    forbidden("Cet espace est réservé à la propriétaire.");
  }
  return user;
}

export function assertZoneScope(user: User, zoneId: string): void {
  if (isOwnerRole(user.role)) return;
  if (user.role === UserRole.SELLER) {
    if (!user.assigned_zone_id || user.assigned_zone_id !== zoneId) {
      forbidden("La vendeuse ne peut travailler que dans sa zone assignée.");
    }
    return;
  }
  forbidden("Rôle non autorisé.");
}

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Prisma.InputJsonValue | null;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actor_id: input.actorId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      payload: input.payload ?? undefined,
    },
  });
}
