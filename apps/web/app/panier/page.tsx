import type { Metadata } from "next";
import { CartPage } from "@/components/checkout/CartPage";

export const metadata: Metadata = {
  title: "Panier",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <CartPage />;
}
