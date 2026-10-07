import type { NextConfig } from "next";

/** Standalone uniquement pour le package O2Switch (`BUILD_TARGET=o2switch`). */
const o2switch = process.env.BUILD_TARGET === "o2switch";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(o2switch ? { output: "standalone" as const } : {}),
  serverExternalPackages: ["@prisma/client", "minio", "@node-rs/argon2"],
};

export default nextConfig;
