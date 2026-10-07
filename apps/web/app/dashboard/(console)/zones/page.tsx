"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorNote } from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/admin/api";
import type { ZoneOut } from "@/lib/admin/types";
import { minorToInput, parseMajorToMinor } from "@/lib/money";
import { fulfillmentLabels, type FulfillmentMode } from "@/lib/status";

export default function ZonesPage() {
  const [zones, setZones] = useState<ZoneOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fees, setFees] = useState<Record<string, string>>({});

  function load() {
    return adminJson<ZoneOut[]>("/api/v1/zones/all").then((rows) => {
      setZones(rows);
      const next: Record<string, string> = {};
      for (const zone of rows) {
        for (const mode of zone.fulfillment_modes) {
          next[`${zone.id}:${mode.mode}`] = minorToInput(mode.default_fee_amount, zone.currency.code);
        }
      }
      setFees(next);
    });
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  async function toggle(zone: ZoneOut, mode: FulfillmentMode, enabled: boolean) {
    setError(null);
    try {
      await adminJson(`/api/v1/zones/${zone.id}/fulfillment-modes/${mode}`, {
        method: "PATCH",
        body: JSON.stringify({ is_enabled: enabled }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    }
  }

  async function saveFee(zone: ZoneOut, mode: FulfillmentMode) {
    const raw = fees[`${zone.id}:${mode}`] ?? "";
    const amount = raw.trim() === "" ? null : parseMajorToMinor(raw, zone.currency.code);
    if (raw.trim() !== "" && amount == null) {
      setError("Montant de frais invalide.");
      return;
    }
    setError(null);
    try {
      await adminJson(`/api/v1/zones/${zone.id}/fulfillment-modes/${mode}`, {
        method: "PATCH",
        body: JSON.stringify({ default_fee_amount: amount ?? 0 }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Frais impossibles à enregistrer.");
    }
  }

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Commercial</p>
          <h1 className="on-h1">Zones</h1>
        </div>
      </header>
      <ErrorNote message={error} />
      {zones && zones.length === 0 ? <EmptyState title="Aucune zone" /> : null}
      {zones?.map((zone) => (
        <section key={zone.id} className="adm-zone-block">
          <h2 className="on-h3">{zone.name}</h2>
          <p className="on-small">Devise : {zone.currency.code} · stock et prix propres à cette zone</p>
          {zone.fulfillment_modes.map((mode) => (
            <div key={mode.id}>
              <div className="adm-toggle">
                <span>{fulfillmentLabels[mode.mode as FulfillmentMode] ?? mode.label}</span>
                <button
                  type="button"
                  className="adm-chip"
                  aria-pressed={mode.is_enabled}
                  onClick={() => toggle(zone, mode.mode as FulfillmentMode, !mode.is_enabled)}
                >
                  {mode.is_enabled ? "ACTIVÉ" : "DÉSACTIVÉ"}
                </button>
              </div>
              {mode.mode !== "PICKUP" ? (
                <label className="on-field">
                  <span>Frais par défaut ({zone.currency.code})</span>
                  <div className="adm-actions">
                    <input
                      className="on-input"
                      value={fees[`${zone.id}:${mode.mode}`] ?? ""}
                      onChange={(e) => setFees((current) => ({ ...current, [`${zone.id}:${mode.mode}`]: e.target.value }))}
                      placeholder="0 = à confirmer à la commande"
                    />
                    <button type="button" className="on-btn on-btn--sm on-btn--secondary" onClick={() => saveFee(zone, mode.mode as FulfillmentMode)}>
                      Enregistrer
                    </button>
                  </div>
                </label>
              ) : null}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
