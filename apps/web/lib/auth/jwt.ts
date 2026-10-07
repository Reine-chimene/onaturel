import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { UserRole } from "@/types/enums";

export type AccessPayload = JWTPayload & {
  sub: string;
  role: UserRole;
  zone_id: string | null;
  typ: "access";
  jti: string;
};

export type RefreshPayload = JWTPayload & {
  sub: string;
  tid: string;
  typ: "refresh";
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || "change-me-to-a-long-random-string";
  return new TextEncoder().encode(secret);
}

function accessMinutes(): number {
  return Number(process.env.JWT_ACCESS_MINUTES || 30);
}

function refreshDays(): number {
  return Number(process.env.JWT_REFRESH_DAYS || 14);
}

export function getRefreshDays(): number {
  return refreshDays();
}

export async function createAccessToken(input: {
  userId: string;
  role: UserRole;
  zoneId: string | null;
}): Promise<string> {
  return new SignJWT({
    role: input.role,
    zone_id: input.zoneId,
    typ: "access",
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${accessMinutes()}m`)
    .sign(secretKey());
}

export async function createRefreshToken(input: { userId: string; tokenId: string }): Promise<string> {
  return new SignJWT({
    tid: input.tokenId,
    typ: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${refreshDays()}d`)
    .sign(secretKey());
}

export async function decodeToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
  return payload;
}
