#!/usr/bin/env node
/**
 * Assemble le dossier dist/o2switch prêt à uploader sur O2Switch.
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "..", "..", "dist", "o2switch");

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

const standalone = join(root, ".next", "standalone");
cpSync(standalone, dest, { recursive: true });
cpSync(join(root, ".next", "static"), join(dest, ".next", "static"), { recursive: true });
cpSync(join(root, "public"), join(dest, "public"), { recursive: true });
cpSync(join(root, "prisma"), join(dest, "prisma"), { recursive: true });
mkdirSync(join(dest, "storage", "media", "products"), { recursive: true });
mkdirSync(join(dest, "storage", "media", "cms"), { recursive: true });

cpSync(join(root, ".env.o2switch.example"), join(dest, ".env.example"));
cpSync(join(root, "deploy", "o2switch", ".htaccess"), join(dest, ".htaccess"));

writeFileSync(
  join(dest, "README-DEPLOIEMENT.txt"),
  [
    "O'Naturelle — package O2Switch",
    "",
    "1. Uploadez ce dossier sur le serveur (ex. ~/onaturelle)",
    "2. Copiez .env.example vers .env et renseignez les valeurs",
    "3. cPanel → Setup Node.js App → startup file: server.js",
    "4. SSH : npx prisma migrate deploy && npx prisma db seed",
    "",
    "Guide complet : docs/DEPLOIEMENT_O2SWITCH.md",
    "",
  ].join("\n"),
);

console.log(`Package O2Switch prêt : ${dest}`);
