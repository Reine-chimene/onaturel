"use client";

import { useEffect, useId, useRef, useState } from "react";
import { type ZoneId } from "@/lib/zone";

export type { ZoneId };

function FlagCameroon() {
  return (
    <svg className="home-flag" viewBox="0 0 9 6" aria-hidden="true">
      <rect width="3" height="6" fill="#007a5e" />
      <rect x="3" width="3" height="6" fill="#ce1126" />
      <rect x="6" width="3" height="6" fill="#fcd116" />
      <path fill="#fcd116" d="M4.5 2.05 4.85 3.1 6 3.1 5.07 3.75 5.42 4.8 4.5 4.15 3.58 4.8 3.93 3.75 3 3.1h1.15Z" />
    </svg>
  );
}

function FlagEurope() {
  return (
    <svg className="home-flag" viewBox="0 0 9 6" aria-hidden="true">
      <rect width="9" height="6" fill="#003399" />
      <circle cx="4.5" cy="3" r="1.15" fill="none" stroke="#ffcc00" strokeWidth="0.35" />
      <circle cx="4.5" cy="3" r="0.28" fill="#ffcc00" />
    </svg>
  );
}

const ZONES: {
  id: ZoneId;
  label: string;
  compact: string;
  Flag: typeof FlagCameroon;
}[] = [
  { id: "cameroun", label: "Cameroun · XAF", compact: "CM · XAF", Flag: FlagCameroon },
  { id: "europe", label: "Europe · EUR", compact: "EU · EUR", Flag: FlagEurope },
];

export function ZonePicker({
  zone,
  onZone,
  variant = "header",
}: {
  zone: ZoneId;
  onZone: (zone: ZoneId) => void;
  variant?: "header" | "panel";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = ZONES.find((item) => item.id === zone) ?? ZONES[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`home-zone home-zone--${variant}`} ref={root}>
      <button
        type="button"
        className="home-zone__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Zone ${current.label}`}
        onClick={() => setOpen((value) => !value)}
      >
        <current.Flag />
        <span className="home-zone__full">{current.label}</span>
        <span className="home-zone__compact">{current.compact}</span>
      </button>
      {open ? (
        <ul className="home-zone__menu" id={listId} role="listbox" aria-label="Zone commerciale">
          {ZONES.map((item) => (
            <li key={item.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={item.id === zone}
                className={item.id === zone ? "is-active" : ""}
                onClick={() => {
                  onZone(item.id);
                  setOpen(false);
                }}
              >
                <item.Flag />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
