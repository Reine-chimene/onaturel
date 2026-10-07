import type { Metadata } from "next";
import { ConfirmationPage } from "@/components/checkout/ConfirmationPage";

export const metadata: Metadata = {
  title: "Confirmation",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ number: string }> };

export default async function Page({ params }: Props) {
  const { number } = await params;
  return <ConfirmationPage number={number} />;
}
