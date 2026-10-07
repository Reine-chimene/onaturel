"use client";

import { useParams, useRouter } from "next/navigation";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { adminJson } from "@/lib/admin/api";
import { useState } from "react";
import { ErrorNote } from "@/components/admin/AdminShell";

export default function EditProduitPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm("Supprimer ce produit définitivement ?")) return;
    try {
      await adminJson(`/api/v1/products/${params.id}`, { method: "DELETE" });
      router.replace("/dashboard/produits");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Produits</p>
          <h1 className="on-h1">Modifier le produit</h1>
        </div>
        <button type="button" className="on-btn on-btn--danger" onClick={remove}>
          Supprimer
        </button>
      </header>
      <ErrorNote message={error} />
      <ProductEditor productId={params.id} />
    </>
  );
}
