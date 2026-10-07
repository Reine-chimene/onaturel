import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/admin.css";

export const metadata: Metadata = {
  title: "Espace propriétaire",
  robots: { index: false, follow: false },
};

export default function DashboardRootLayout({ children }: { children: ReactNode }) {
  return children;
}
