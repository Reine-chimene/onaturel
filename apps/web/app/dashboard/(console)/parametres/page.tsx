"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ErrorNote } from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/admin/api";

export default function ParametresPage() {
  const [threshold, setThreshold] = useState("5");
  const [brand, setBrand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);

  useEffect(() => {
    adminJson<Record<string, { value?: unknown; name?: string }>>("/api/v1/settings")
      .then((data) => {
        const low = data.default_low_stock_threshold?.value;
        if (typeof low === "number") setThreshold(String(low));
        if (data.brand?.name && typeof data.brand.name === "string") setBrand(data.brand.name);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await adminJson("/api/v1/settings", {
        method: "PATCH",
        body: JSON.stringify({ key: "default_low_stock_threshold", value: { value: Number(threshold) } }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  async function onPasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas.");
      return;
    }
    setPasswordPending(true);
    try {
      await adminJson("/api/v1/auth/password", {
        method: "PATCH",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Modification impossible.");
    } finally {
      setPasswordPending(false);
    }
  }

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Réglages</p>
          <h1 className="on-h1">Paramètres</h1>
        </div>
      </header>
      {brand ? <p className="on-small">Enseigne : {brand}</p> : null}
      <ErrorNote message={error} />
      <form className="adm-form" onSubmit={onSubmit}>
        <label className="on-field">
          <span>Seuil de stock faible (par défaut)</span>
          <input className="on-input" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          <span className="on-field__hint">Utilisé lorsqu’aucun seuil n’est défini sur une position. L’alerte vient du backend.</span>
        </label>
        <button className="on-btn on-btn--primary" type="submit">Enregistrer</button>
        {saved ? <p className="on-small">Enregistré.</p> : null}
      </form>
      <section className="adm-form adm-form--section">
        <header className="adm-head">
          <div>
            <p className="on-label">Compte</p>
            <h2 className="on-h2">Mot de passe</h2>
          </div>
        </header>
        <ErrorNote message={passwordError} />
        <form className="adm-form" onSubmit={onPasswordSubmit}>
          <label className="on-field">
            <span>Mot de passe actuel</span>
            <input
              className="on-input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <label className="on-field">
            <span>Nouveau mot de passe</span>
            <input
              className="on-input"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>
          <label className="on-field">
            <span>Confirmer le nouveau mot de passe</span>
            <input
              className="on-input"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>
          <button className="on-btn on-btn--primary" type="submit" disabled={passwordPending}>
            {passwordPending ? "Enregistrement…" : "Changer le mot de passe"}
          </button>
          {passwordSaved ? <p className="on-small">Mot de passe mis à jour.</p> : null}
        </form>
      </section>
    </>
  );
}
