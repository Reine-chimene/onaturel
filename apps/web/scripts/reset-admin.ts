/**
 * Réinitialise ou crée le compte propriétaire (Neon / prod).
 *
 * ADMIN_EMAIL=onqture@onaturelle.com ADMIN_PASSWORD=... npx tsx scripts/reset-admin.ts
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { UserRole } from "../types/enums";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "onqture@onaturelle.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "naturel2";
  const fullName = process.env.ADMIN_NAME ?? "O'Naturelle";

  if (password.length < 6) {
    throw new Error("ADMIN_PASSWORD doit contenir au moins 6 caractères.");
  }

  const hashed = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        hashed_password: hashed,
        full_name: fullName,
        role: UserRole.OWNER,
        is_active: true,
        assigned_zone_id: null,
      },
    });
    console.log(`Mot de passe mis à jour pour ${email}`);
  } else {
    await prisma.user.create({
      data: {
        email,
        hashed_password: hashed,
        full_name: fullName,
        role: UserRole.OWNER,
        is_active: true,
      },
    });
    console.log(`Compte admin créé : ${email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
