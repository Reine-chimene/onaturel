import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { decodeToken, createAccessToken, createRefreshToken, getRefreshDays } from "@/lib/auth/jwt";
import { issueTokens, hashRefreshToken } from "@/lib/auth/session";
import { isOwnerRole } from "@/lib/auth/rbac";
import { forbidden, unauthorized, conflict, notFound, badRequest } from "@/lib/utils/errors";
import { UserRole } from "@/types/enums";
import { normalizeLoginEmail } from "@/lib/auth/login-email";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeLoginEmail(email) } });
  if (!user || !user.is_active || !(await verifyPassword(password, user.hashed_password))) {
    unauthorized("Identifiants invalides.");
  }
  if (user.role === UserRole.SELLER && !user.assigned_zone_id) {
    forbidden("Compte vendeuse sans zone assignée.");
  }
  const tokens = await issueTokens(user);
  await writeAudit({ actorId: user.id, action: "auth.login", entityType: "user", entityId: user.id });
  return tokens;
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = await decodeToken(refreshToken);
  } catch {
    unauthorized("Refresh invalide.");
  }
  if (payload.typ !== "refresh") unauthorized("Refresh invalide.");
  const tokenHash = hashRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { token_hash: tokenHash } });
  const now = new Date();
  if (!stored || stored.revoked_at || stored.expires_at < now) {
    unauthorized("Refresh révoqué ou expiré.");
  }
  const user = await prisma.user.findUnique({ where: { id: stored.user_id } });
  if (!user || !user.is_active) unauthorized("Compte inactif.");
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked_at: now } });
  return issueTokens(user);
}

export async function logout(userId: string, refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { token_hash: tokenHash, user_id: userId },
  });
  if (stored) {
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked_at: new Date() } });
  }
  await writeAudit({ actorId: userId, action: "auth.logout", entityType: "user", entityId: userId });
  return { ok: true };
}

export function meOut(user: { id: string; email: string; full_name: string; role: string; assigned_zone_id: string | null; is_active: boolean }) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    assigned_zone_id: user.assigned_zone_id,
    is_active: user.is_active,
  };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.is_active) unauthorized("Compte inactif.");
  if (!(await verifyPassword(currentPassword, user.hashed_password))) {
    unauthorized("Mot de passe actuel incorrect.");
  }
  if (newPassword.length < 6) badRequest("Le nouveau mot de passe doit contenir au moins 6 caractères.");
  await prisma.user.update({
    where: { id: userId },
    data: { hashed_password: await hashPassword(newPassword) },
  });
  await writeAudit({
    actorId: userId,
    action: "auth.password_change",
    entityType: "user",
    entityId: userId,
  });
  return { ok: true };
}

export async function createUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  assignedZoneId?: string | null;
  actorId: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) conflict("Email déjà utilisé.");
  let assigned = input.assignedZoneId ?? null;
  if (input.role === UserRole.SELLER) {
    if (!assigned) badRequest("Une vendeuse doit être rattachée à une zone.");
    const zone = await prisma.commercialZone.findUnique({ where: { id: assigned } });
    if (!zone) notFound("Zone introuvable.");
  }
  if (isOwnerRole(input.role)) assigned = null;
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      hashed_password: await hashPassword(input.password),
      full_name: input.fullName,
      role: input.role,
      assigned_zone_id: assigned,
      is_active: true,
    },
  });
  await writeAudit({
    actorId: input.actorId,
    action: "user.create",
    entityType: "user",
    entityId: user.id,
    payload: { email: user.email, role: user.role, assigned_zone_id: assigned },
  });
  return meOut(user);
}

export { createAccessToken, createRefreshToken, getRefreshDays };
