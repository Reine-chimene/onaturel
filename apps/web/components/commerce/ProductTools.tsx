"use client";

import { useState } from "react";

export function ProductGallery({ alts }: { alts: string[] }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="on-gallery">
      <div className="on-gallery__main">
        <div className="on-image-frame" style={{ minHeight: "100%" }}>
          {alts[current] ?? "Galerie"}
        </div>
      </div>
      <div className="on-gallery__thumbs">
        {alts.map((alt, index) => (
          <button
            key={alt}
            type="button"
            aria-label={alt}
            aria-current={index === current}
            onClick={() => setCurrent(index)}
          />
        ))}
      </div>
    </div>
  );
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 9,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="on-qty">
      <button
        type="button"
        aria-label="Diminuer la quantité"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        aria-label="Augmenter la quantité"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}

export function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="on-breadcrumb" aria-label="Fil d'Ariane">
      {items.map((item, index) => (
        <span key={item.label}>
          {item.href ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}
          {index < items.length - 1 ? " / " : null}
        </span>
      ))}
    </nav>
  );
}

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="on-filters" role="group" aria-label="Filtres">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className="on-chip"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function WhatsAppCTA({ href = "#" }: { href?: string }) {
  return (
    <a className="on-whatsapp" href={href}>
      Commander via WhatsApp
    </a>
  );
}
