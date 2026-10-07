import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const metadata = {
  title: "Design system — O’Naturelle",
  robots: { index: false, follow: false },
};

export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  const enabled =
    process.env.NODE_ENV !== "production" || process.env.ENABLE_DESIGN_SYSTEM === "true";
  if (!enabled) notFound();
  return children;
}
