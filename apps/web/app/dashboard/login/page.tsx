"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/?manager=1");
  }, [router]);

  return (
    <main className="adm-login">
      <p className="on-small">Redirection…</p>
    </main>
  );
}
