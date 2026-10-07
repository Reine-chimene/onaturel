/**
 * Point d'entrée Passenger (O2Switch) — lance le serveur Next.js standalone.
 * En production, préférer le server.js généré dans .next/standalone/ après build.
 */
const path = require("path");

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const standaloneDir = path.join(__dirname, ".next", "standalone");
const standaloneServer = path.join(standaloneDir, "server.js");

try {
  process.chdir(standaloneDir);
  require(standaloneServer);
} catch (err) {
  console.error("Impossible de démarrer le serveur standalone. Lancez « npm run build » d'abord.");
  console.error(err);
  process.exit(1);
}
