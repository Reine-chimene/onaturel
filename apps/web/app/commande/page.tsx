import type { Metadata } from "next";
import { CheckoutPage } from "@/components/checkout/CheckoutPage";

export const metadata: Metadata = {
  title: "Commande",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <CheckoutPage />;
}
