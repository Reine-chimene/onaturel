"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ErrorNote } from "@/components/admin/AdminShell";
import { adminFetch, adminJson } from "@/lib/admin/api";
import type { CategoryAdmin, ProductAdmin, ProductImageOut, ZoneOut } from "@/lib/admin/types";
import { minorToInput, parseMajorToMinor, type CurrencyCode } from "@/lib/money";

type Props = { productId?: string };

export function ProductEditor({ productId }: Props) {
  const router = useRouter();
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [stocks, setStocks] = useState<Record<string, string>>({});
  const [images, setImages] = useState<ProductImageOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(Boolean(productId));

  useEffect(() => {
    Promise.all([
      adminJson<ZoneOut[]>("/api/v1/zones/all"),
      adminJson<CategoryAdmin[]>("/api/v1/categories"),
    ]).then(([z, c]) => {
      setZones(z);
      setCategories(c);
    }).catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!productId) return;
    adminJson<ProductAdmin>(`/api/v1/products/${productId}`)
      .then((product) => {
        setName(product.name);
        setSlug(product.slug);
        setSku(product.sku ?? "");
        setDescription(product.description ?? "");
        setCategoryId(product.category_id ?? "");
        setIsActive(product.is_active);
        setIsFeatured(product.is_featured);
        setIsNew(product.is_new);
        setImages(product.images);
        const nextPrices: Record<string, string> = {};
        const nextAvail: Record<string, boolean> = {};
        const nextStocks: Record<string, string> = {};
        for (const zone of product.zones) {
          nextPrices[zone.zone_id] = minorToInput(zone.price_amount, zone.currency_code);
          nextAvail[zone.zone_id] = zone.is_available;
          nextStocks[zone.zone_id] = String(zone.stock);
        }
        setPrices(nextPrices);
        setAvailable(nextAvail);
        setStocks(nextStocks);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [productId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const body = {
        name,
        slug: slug || undefined,
        sku: sku || null,
        description: description || null,
        category_id: categoryId || null,
        is_active: isActive,
        is_featured: isFeatured,
        is_new: isNew,
        prices: zones.map((zone) => {
          const parsed = parseMajorToMinor(prices[zone.id] ?? "", zone.currency.code as CurrencyCode);
          return {
            zone_id: zone.id,
            price_amount: parsed,
            is_available: available[zone.id] ?? Boolean(parsed),
          };
        }),
        stocks: zones.map((zone) => ({
          zone_id: zone.id,
          qty: Number(stocks[zone.id] || 0),
        })),
      };
      const saved = productId
        ? await adminJson<ProductAdmin>(`/api/v1/products/${productId}`, { method: "PATCH", body: JSON.stringify(body) })
        : await adminJson<ProductAdmin>("/api/v1/products", { method: "POST", body: JSON.stringify(body) });
      if (!productId) {
        router.replace("/dashboard/produits");
        return;
      }
      setSuccess("Modifications enregistrées.");
      setName(saved.name);
      setSlug(saved.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setPending(false);
    }
  }

  async function uploadPhoto(file: File, asPrimary: boolean) {
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const uploaded = await adminFetch("/api/v1/files", { method: "POST", body: form });
    if (!uploaded.ok) throw new Error("Téléversement impossible.");
    const asset = (await uploaded.json()) as { id: string };
    if (!productId) throw new Error("Enregistrez d’abord le produit avant d’ajouter une photo.");
    const product = await adminJson<ProductAdmin>(`/api/v1/products/${productId}/images?file_id=${asset.id}&as_primary=${asPrimary}`, { method: "POST" });
    setImages(product.images);
  }

  async function uploadPhotos(files: FileList) {
    let makePrimary = images.length === 0;
    for (const file of Array.from(files)) {
      await uploadPhoto(file, makePrimary);
      makePrimary = false;
    }
  }

  async function removePhoto(imageId: string) {
    if (!productId) return;
    const product = await adminJson<ProductAdmin>(`/api/v1/products/${productId}/images/${imageId}`, { method: "DELETE" });
    setImages(product.images);
  }

  async function makePrimary(imageId: string) {
    if (!productId) return;
    const body = images.map((image, index) => ({
      id: image.id,
      sort_order: index,
      is_primary: image.id === imageId,
    }));
    const product = await adminJson<ProductAdmin>(`/api/v1/products/${productId}/images`, { method: "PUT", body: JSON.stringify(body) });
    setImages(product.images);
  }

  async function move(index: number, delta: number) {
    if (!productId) return;
    const next = [...images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    const body = next.map((image, order) => ({ id: image.id, sort_order: order, is_primary: image.is_primary }));
    const product = await adminJson<ProductAdmin>(`/api/v1/products/${productId}/images`, { method: "PUT", body: JSON.stringify(body) });
    setImages(product.images);
  }

  if (loading) return <p className="on-small">Chargement du produit…</p>;

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      <ErrorNote message={error} />
      {success ? <p className="adm-success">{success}</p> : null}
      <div className="adm-form-grid">
      <label className="on-field">
        <span>Nom</span>
        <input className="on-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="on-field">
        <span>Slug</span>
        <input className="on-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="généré automatiquement si vide" />
      </label>
      <label className="on-field">
        <span>Référence (SKU)</span>
        <input className="on-input" value={sku} onChange={(e) => setSku(e.target.value)} />
      </label>
      <label className="on-field">
        <span>Catégorie</span>
        <select className="on-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Sans catégorie</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </label>
      <label className="on-field on-field--wide">
        <span>Description</span>
        <textarea className="on-input" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label className="on-field">
        <span>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Actif
        </span>
      </label>
      <label className="on-field">
        <span>
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} /> Mis en avant
        </span>
      </label>
      <label className="on-field">
        <span>
          <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} /> Nouveau
        </span>
      </label>
      </div>

      <p className="on-h3">Prix et stock par zone</p>
      <p className="on-small">Cameroun (XAF) et Europe (EUR) sont indépendants. Aucune conversion automatique.</p>
      <div className="adm-zone-row">
      {zones.map((zone) => (
        <div className="adm-zone-block" key={zone.id}>
          <p className="on-label">{zone.name}</p>
          <p className="on-small">Devise {zone.currency.code} — aucune conversion.</p>
          <label className="on-field">
            <span>Prix ({zone.currency.code})</span>
            <input
              className="on-input"
              value={prices[zone.id] ?? ""}
              onChange={(e) => setPrices((current) => ({ ...current, [zone.id]: e.target.value }))}
              placeholder={zone.currency.code === "EUR" ? "ex. 15,00" : "ex. 8000"}
            />
          </label>
          <label className="on-field">
            <span>
              <input
                type="checkbox"
                checked={available[zone.id] ?? false}
                onChange={(e) => setAvailable((current) => ({ ...current, [zone.id]: e.target.checked }))}
              />{" "}
              Disponible commercialement
            </span>
          </label>
          <label className="on-field">
            <span>Stock</span>
            <input
              className="on-input"
              inputMode="numeric"
              value={stocks[zone.id] ?? "0"}
              onChange={(e) => setStocks((current) => ({ ...current, [zone.id]: e.target.value }))}
            />
          </label>
        </div>
      ))}
      </div>

      <div>
        <p className="on-h3">Photos</p>
        {!productId ? (
          <p className="on-small">Enregistrez d’abord le produit, puis ouvrez-le pour ajouter des photos.</p>
        ) : (
          <>
            <label className="on-btn on-btn--secondary" style={{ width: "fit-content" }}>
              + Ajouter des photos
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                multiple
                onChange={(event) => {
                  const files = event.target.files;
                  if (files && files.length) uploadPhotos(files).catch((err: Error) => setError(err.message));
                  event.target.value = "";
                }}
              />
            </label>
            <p className="on-small">JPEG, PNG ou WebP · 8 Mo max. par photo · stockées dans MinIO</p>
            {images.length === 0 ? <p className="on-small">Aucune photo pour l’instant.</p> : null}
            <div className="adm-photos">
              {images.map((image, index) => (
                <article className={`adm-photo${image.is_primary ? " adm-photo--primary" : ""}`} key={image.id}>
                  {image.url ? <img src={image.url} alt="" /> : <div className="adm-thumb" />}
                  {image.is_primary ? <span className="on-small">Principale</span> : (
                    <button type="button" className="on-btn on-btn--ghost on-btn--sm" onClick={() => makePrimary(image.id)}>Définir principale</button>
                  )}
                  <div className="adm-actions">
                    <button type="button" className="on-btn on-btn--ghost on-btn--sm" onClick={() => move(index, -1)}>Monter</button>
                    <button type="button" className="on-btn on-btn--ghost on-btn--sm" onClick={() => move(index, 1)}>Descendre</button>
                    <button type="button" className="on-btn on-btn--danger on-btn--sm" onClick={() => removePhoto(image.id)}>Supprimer</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="adm-actions">
        <button className="on-btn on-btn--primary" type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : productId ? "Enregistrer les modifications" : "Créer le produit"}
        </button>
        <Link className="on-btn on-btn--ghost" href="/dashboard/produits">Annuler</Link>
      </div>
    </form>
  );
}
