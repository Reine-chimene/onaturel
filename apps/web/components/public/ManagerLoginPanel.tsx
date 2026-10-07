"use client";

import { ManagerLoginForm } from "@/components/public/ManagerLoginForm";

export function ManagerLoginPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <>
      <button type="button" className="home-manager__scrim" aria-label="Fermer" onClick={onClose} />
      <div className="home-manager" role="dialog" aria-label="Connexion Manager" aria-modal="true">
        <button type="button" className="home-manager__close" aria-label="Fermer" onClick={onClose}>
          ×
        </button>
        <ManagerLoginForm onSuccess={onClose} />
      </div>
    </>
  );
}
