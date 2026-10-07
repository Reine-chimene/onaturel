"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CmsImageField } from "@/components/admin/CmsImageField";
import { EmptyState, ErrorNote } from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/admin/api";
import type { CategoryAdmin } from "@/lib/admin/types";
import type { CmsImage } from "@/lib/site-content/types";

export default function CategoriesPage() {
  const [rows, setRows] = useState<CategoryAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<CmsImage>({ alt: "" });
  const [editing, setEditing] = useState<CategoryAdmin | null>(null);

  function load() {
    return adminJson<CategoryAdmin[]>("/api/v1/categories").then(setRows);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  function startEdit(row: CategoryAdmin) {
    setEditing(row);
    setName(row.name);
    setDescription(row.description ?? "");
    setImage({ file_id: row.image_file_id, url: row.image_url ?? undefined, alt: row.name });
  }

  function resetForm() {
    setEditing(null);
    setName("");
    setDescription("");
    setImage({ alt: "" });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const payload = {
        name,
        description: description || null,
        image_file_id: image.file_id ?? null,
      };
      if (editing) {
        await adminJson(`/api/v1/categories/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await adminJson("/api/v1/categories", { method: "POST", body: JSON.stringify(payload) });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  async function toggle(row: CategoryAdmin) {
    setError(null);
    try {
      await adminJson(`/api/v1/categories/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_visible: !row.is_visible }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    }
  }

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Catalogue</p>
          <h1 className="on-h1">Catégories</h1>
          <p className="on-small">Ajoutez une photo pour chaque univers — elle remplace l’image par défaut sur le site.</p>
        </div>
      </header>
      <ErrorNote message={error} />
      {!rows && !error ? <p className="on-small">Chargement…</p> : null}
      <form className="adm-form" onSubmit={onSubmit}>
        <label className="on-field">
          <span>{editing ? "Modifier" : "Nouvelle catégorie"}</span>
          <input className="on-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="on-field on-field--wide">
          <span>Description (texte boutique)</span>
          <textarea className="on-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <CmsImageField label="Photo de l’univers" value={image} onChange={setImage} />
        <div className="adm-actions">
          <button className="on-btn on-btn--primary" type="submit">{editing ? "Mettre à jour" : "Créer"}</button>
          {editing ? (
            <button type="button" className="on-btn on-btn--ghost" onClick={resetForm}>
              Annuler
            </button>
          ) : null}
        </div>
      </form>
      {rows && rows.length === 0 ? <EmptyState title="Aucune catégorie" text="Créez la première catégorie à partir du formulaire." /> : null}
      {rows && rows.length > 0 ? (
        <div className="on-table-wrap" style={{ marginTop: "2rem" }}>
          <table className="on-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Nom</th>
                <th>Visible</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.image_url ? (
                      <img src={row.image_url} alt="" className="cms-image__preview" style={{ maxWidth: "3.5rem" }} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{row.name}</td>
                  <td>{row.is_visible ? "Oui" : "Non"}</td>
                  <td>
                    <div className="adm-actions">
                      <button type="button" className="on-btn on-btn--ghost on-btn--sm" onClick={() => startEdit(row)}>
                        Modifier
                      </button>
                      <button type="button" className="on-btn on-btn--secondary on-btn--sm" onClick={() => toggle(row)}>
                        {row.is_visible ? "Masquer" : "Afficher"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
