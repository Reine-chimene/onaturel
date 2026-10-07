import { PrismaClient } from "@prisma/client";

function databaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? "";
  return raw.replace("postgresql+psycopg://", "postgresql://");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
