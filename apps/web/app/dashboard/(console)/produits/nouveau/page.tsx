"use client";

import { ProductEditor } from "@/components/admin/ProductEditor";

export default function NouveauProduitPage() {
  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Produits</p>
          <h1 className="on-h1">Nouveau produit</h1>
        </div>
      </header>
      <ProductEditor />
    </>
  );
}
