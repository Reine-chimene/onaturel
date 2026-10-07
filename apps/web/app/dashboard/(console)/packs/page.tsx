"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CmsImageField } from "@/components/admin/CmsImageField";
import { EmptyState, ErrorNote } from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/admin/api";
import type { CmsImage } from "@/lib/site-content/types";
import type { PackAdmin, ProductAdmin, ZoneOut } from "@/lib/admin/types";
import { formatMoney, parseMajorToMinor, type CurrencyCode } from "@/lib/money";

type Line = { product_id: string; quantity: number };

export default function PacksPage() {
  const [packs, setPacks] = useState<PackAdmin[] | null>(null);
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: 1 }]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [image, setImage] = useState<CmsImage>({ alt: "" });

  function load() {
    return adminJson<PackAdmin[]>("/api/v1/packs").then(setPacks);
  }

  useEffect(() => {
    Promise.all([load(), adminJson<ProductAdmin[]>("/api/v1/products"), adminJson<ZoneOut[]>("/api/v1/zones/all")])
      .then(([, p, z]) => {
        setProducts(p);
        setZones(z);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await adminJson("/api/v1/packs", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || null,
          image_file_id: image.file_id ?? null,
          is_active: active,
          items: lines.filter((line) => line.product_id).map((line) => ({ product_id: line.product_id, quantity: line.quantity })),
          prices: zones.map((zone) => ({
            zone_id: zone.id,
            price_amount: parseMajorToMinor(prices[zone.id] ?? "", zone.currency.code as CurrencyCode),
            is_available: Boolean(prices[zone.id]),
          })),
        }),
      });
      setName("");
      setDescription("");
      setActive(true);
      setLines([{ product_id: "", quantity: 1 }]);
      setPrices({});
      setImage({ alt: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    }
  }

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Catalogue</p>
          <h1 className="on-h1">Packs</h1>
        </div>
      </header>
      <ErrorNote message={error} />
      <form className="adm-form" onSubmit={onSubmit}>
        <label className="on-field">
          <span>Nom du pack</span>
          <input className="on-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="on-field">
          <span>Description</span>
          <textarea className="on-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <CmsImageField label="Photo du pack" value={image} onChange={setImage} />
        <label className="on-field">
          <span>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Actif
          </span>
        </label>
        {lines.map((line, index) => (
          <div className="adm-actions" key={index}>
            <select
              className="on-select"
              value={line.product_id}
              onChange={(e) => setLines((current) => current.map((item, i) => (i === index ? { ...item, product_id: e.target.value } : item)))}
            >
              <option value="">Produit</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input
              className="on-input"
              style={{ width: "5rem" }}
              type="number"
              min={1}
              value={line.quantity}
              onChange={(e) => setLines((current) => current.map((item, i) => (i === index ? { ...item, quantity: Number(e.target.value) } : item)))}
            />
          </div>
        ))}
        <button type="button" className="on-btn on-btn--ghost" onClick={() => setLines((current) => [...current, { product_id: "", quantity: 1 }])}>
          Ajouter un composant
        </button>
        {zones.map((zone) => (
          <label className="on-field" key={zone.id}>
            <span>Prix {zone.name} ({zone.currency.code})</span>
            <input className="on-input" value={prices[zone.id] ?? ""} onChange={(e) => setPrices((c) => ({ ...c, [zone.id]: e.target.value }))} />
          </label>
        ))}
        <button className="on-btn on-btn--primary" type="submit">Créer le pack</button>
      </form>
      {packs && packs.length === 0 ? <EmptyState title="Aucun pack" /> : null}
      {packs && packs.length > 0 ? (
        <div className="adm-cards" style={{ marginTop: "2rem" }}>
          {packs.map((pack) => (
            <article className="adm-card" key={pack.id}>
              {pack.image_url ? <img src={pack.image_url} alt="" style={{ maxWidth: "6rem", borderRadius: "0.35rem" }} /> : null}
              <p className="on-h3">{pack.name}</p>
              {pack.description ? <p className="on-small">{pack.description}</p> : null}
              <p className="on-small">{pack.is_active ? "Actif" : "Inactif"}</p>
              <p className="on-small">{pack.items.map((item) => `${item.product_name} × ${item.quantity}`).join(" · ")}</p>
              {pack.zones.map((zone) => (
                <p key={zone.zone_id} className="on-small">
                  {zone.zone_name} : {zone.price_amount != null ? formatMoney(zone.price_amount, zone.currency_code) : "sans prix"}
                  {" · stock théorique "}
                  {zone.buildable_qty}
                  {" · "}
                  {zone.available ? "disponible" : "PACK INDISPONIBLE"}
                </p>
              ))}
              <button
                type="button"
                className="on-btn on-btn--sm on-btn--secondary"
                onClick={async () => {
                  await adminJson(`/api/v1/packs/${pack.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ is_active: !pack.is_active }),
                  });
                  await load();
                }}
              >
                {pack.is_active ? "Désactiver" : "Activer"}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </>
  );
}
