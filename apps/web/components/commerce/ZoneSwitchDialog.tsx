"use client";

import { zoneLabel, type ZoneId } from "@/lib/zone";

export function ZoneSwitchDialog({
  current,
  next,
  onConfirm,
  onCancel,
}: {
  current: ZoneId;
  next: ZoneId;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="on-overlay" onClick={onCancel} role="presentation">
      <div
        className="on-modal chk-dialog"
        role="dialog"
        aria-labelledby="zone-switch-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="on-label">Zone</p>
        <h2 id="zone-switch-title">Votre panier reste dans {zoneLabel(current)}</h2>
        <p>
          Les prix {zoneLabel(current)} et {zoneLabel(next)} ne se mélangent pas, et ne sont jamais
          convertis. En passant en {zoneLabel(next)}, vous ouvrez un panier distinct.
        </p>
        <div className="chk-dialog__actions">
          <button type="button" className="on-btn on-btn--secondary" onClick={onCancel}>
            Rester ici
          </button>
          <button type="button" className="on-btn on-btn--primary" onClick={onConfirm}>
            Changer de zone
          </button>
        </div>
      </div>
    </div>
  );
}
