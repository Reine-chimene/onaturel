"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/admin/api";

export function ManagerLoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email.trim(), password);
      onSuccess?.();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="home-manager__form" onSubmit={onSubmit}>
      <div>
        <p className="home-manager__label">Administration</p>
        <h2 className="home-manager__title">Manager</h2>
        <p className="home-manager__hint">Connexion réservée à la propriétaire (e-mail complet).</p>
      </div>
      <label className="home-manager__field">
        <span>Identifiant</span>
        <input
          type="text"
          autoComplete="username"
          placeholder="onqture"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="home-manager__field">
        <span>Mot de passe</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {error ? <p className="home-manager__error">{error}</p> : null}
      <button className="home-manager__submit" type="submit" disabled={pending}>
        {pending ? "Connexion…" : "Entrer"}
      </button>
    </form>
  );
}
