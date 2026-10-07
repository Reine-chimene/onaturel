"use client";

import { useRef, useState } from "react";
import { adminFetch } from "@/lib/admin/api";
import type { CmsImage } from "@/lib/site-content/types";

export function CmsImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CmsImage;
  onChange: (next: CmsImage) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File | null) {
    if (!file) return;
    setError(null);
    setPending(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await adminFetch("/api/v1/files?prefix=cms", { method: "POST", body: form });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(data?.detail ?? "Upload impossible.");
      }
      const data = (await res.json()) as { id: string; url: string };
      onChange({ file_id: data.id, url: data.url, alt: value.alt ?? "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="cms-image">
      <span className="on-field__label">{label}</span>
      {value.url ? (
        <figure className="cms-image__preview">
          <img src={value.url} alt={value.alt ?? ""} />
        </figure>
      ) : (
        <p className="on-small">Aucune image.</p>
      )}
      <label className="on-field">
        <span>Texte alternatif</span>
        <input
          className="on-input"
          value={value.alt ?? ""}
          onChange={(event) => onChange({ ...value, alt: event.target.value })}
        />
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        className="on-btn on-btn--secondary"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? "Envoi…" : value.url ? "Changer l’image" : "Ajouter une image"}
      </button>
      {error ? <p className="on-field__error">{error}</p> : null}
    </div>
  );
}
