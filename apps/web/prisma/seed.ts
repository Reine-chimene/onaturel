import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { ensureDefaultSiteContent } from "../lib/services/site-content.service";
import { UserRole } from "../types/enums";

const prisma = new PrismaClient();

const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "onqture@onaturelle.local").toLowerCase();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "naturel2";
const OWNER_NAME = process.env.OWNER_NAME ?? "O'Naturelle";

async function main() {
  let xaf = await prisma.currency.findUnique({ where: { code: "XAF" } });
  if (!xaf) {
    xaf = await prisma.currency.create({
      data: { code: "XAF", name: "Franc CFA", symbol: "FCFA", minor_units: 0 },
    });
  }

  let eur = await prisma.currency.findUnique({ where: { code: "EUR" } });
  if (!eur) {
    eur = await prisma.currency.create({
      data: { code: "EUR", name: "Euro", symbol: "€", minor_units: 2 },
    });
  }

  let cameroun = await prisma.commercialZone.findUnique({ where: { slug: "cameroun" } });
  if (!cameroun) {
    cameroun = await prisma.commercialZone.create({
      data: { slug: "cameroun", name: "Cameroun", currency_id: xaf.id, sort_order: 10, is_active: true },
    });
  }

  let europe = await prisma.commercialZone.findUnique({ where: { slug: "europe" } });
  if (!europe) {
    europe = await prisma.commercialZone.create({
      data: { slug: "europe", name: "Europe", currency_id: eur.id, sort_order: 20, is_active: true },
    });
  }

  for (const zone of [cameroun, europe]) {
    for (const [mode, label] of [
      ["DELIVERY", "Livraison"],
      ["SHIPPING", "Expédition"],
      ["PICKUP", "Retrait"],
    ] as const) {
      const existing = await prisma.zoneFulfillmentMode.findFirst({
        where: { zone_id: zone.id, mode },
      });
      if (!existing) {
        await prisma.zoneFulfillmentMode.create({
          data: {
            zone_id: zone.id,
            mode,
            label,
            is_enabled: true,
            fee_policy: "SET_AT_PROCESSING",
          },
        });
      }
    }
  }

  const hashed = await hashPassword(OWNER_PASSWORD);
  const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (owner) {
    await prisma.user.update({
      where: { id: owner.id },
      data: { hashed_password: hashed, full_name: OWNER_NAME, role: UserRole.OWNER, is_active: true },
    });
  } else {
    await prisma.user.create({
      data: {
        email: OWNER_EMAIL,
        hashed_password: hashed,
        full_name: OWNER_NAME,
        role: UserRole.OWNER,
        is_active: true,
      },
    });
  }

  for (const [key, value] of [
    ["default_low_stock_threshold", { value: 5 }],
    ["whatsapp_number", { value: null }],
    ["brand", { name: "O'Naturelle", since: 2012 }],
  ] as const) {
    const existing = await prisma.setting.findUnique({ where: { key } });
    if (!existing) {
      await prisma.setting.create({ data: { key, value } });
    }
  }

  await ensureDefaultSiteContent();

  console.log(`Seed OK — owner ${OWNER_EMAIL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
