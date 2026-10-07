"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const NAV = [
  { href: "#accueil", label: "Accueil" },
  { href: "#histoire", label: "Notre histoire" },
  { href: "#boutique", label: "Boutique" },
  { href: "#spirituelle", label: "Cosmétique spirituelle" },
  { href: "#rituels", label: "Rituels" },
  { href: "#contact", label: "Contact" },
];

const MEGA = [
  "Cosmétique bio",
  "Cosmétique spirituelle",
  "Plantes & épices",
  "Huiles",
  "Rituels",
  "Parfums",
  "Sacs & accessoires",
  "Packs",
];

export function PublicHeader({
  zone,
  onZone,
  onCart,
}: {
  zone: "cameroun" | "europe";
  onZone: (zone: "cameroun" | "europe") => void;
  onCart: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);
  return (
    <header>
      <div className="on-header">
        <a className="on-logo" href="#accueil">
          O’Naturelle
        </a>
        <nav className="on-nav" aria-label="Navigation principale">
          {NAV.map((item) =>
            item.label === "Boutique" ? (
              <button
                key={item.label}
                type="button"
                className="on-btn on-btn--ghost on-btn--sm"
                aria-expanded={mega}
                onClick={() => setMega((value) => !value)}
              >
                Boutique
              </button>
            ) : (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ),
          )}
        </nav>
        <div className="on-header__tools">
          <label className="visually-hidden" htmlFor="zone-select">
            Zone commerciale
          </label>
          <select
            id="zone-select"
            className="on-zone"
            value={zone}
            onChange={(event) => onZone(event.target.value as "cameroun" | "europe")}
          >
            <option value="cameroun">Cameroun · FCFA</option>
            <option value="europe">Europe · €</option>
          </select>
          <Button variant="ghost" size="sm" onClick={onCart}>
            Panier
          </Button>
          <button
            type="button"
            className="on-burger"
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      {mega ? (
        <div className="on-mega" role="navigation" aria-label="Univers boutique">
          {MEGA.map((item) => (
            <a key={item} href="#boutique">
              {item}
            </a>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="on-mega" role="navigation" aria-label="Menu mobile">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="on-footer">
      <div className="on-footer__grid">
        <div>
          <p className="on-footer__mark">O’Naturelle</p>
          <p>Nous prenons soin de votre corps et de votre esprit.</p>
        </div>
        <div>
          <p className="on-label" style={{ color: "var(--gold)" }}>
            Univers
          </p>
          <p>
            <a href="#spirituelle">Cosmétique spirituelle</a>
          </p>
          <p>
            <a href="#boutique">Boutique</a>
          </p>
        </div>
        <div>
          <p className="on-label" style={{ color: "var(--gold)" }}>
            Contact
          </p>
          <p>
            <a href="#contact">Écrire</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export function HeroPlaceholder() {
  return (
    <section className="on-hero" aria-label="Hero">
      <div className="on-hero__placeholder">Photographie officielle à intégrer en phase 4</div>
      <div className="on-hero__copy">
        <p className="on-label" style={{ color: "var(--gold)" }}>
          O’Naturelle
        </p>
        <h1 className="on-display">La beauté qui prend soin du corps et de l’esprit.</h1>
        <p>Cosmétique bio · Cosmétique spirituelle · Rituels de soins</p>
        <div className="on-ds__row" style={{ marginTop: "1.5rem" }}>
          <Button>Découvrir notre univers</Button>
          <Button variant="secondary">Voir les produits</Button>
        </div>
      </div>
    </section>
  );
}

export function EditorialSection() {
  return (
    <section className="on-editorial on-editorial--split">
      <div>
        <p className="on-label">Depuis 2012</p>
        <h2 className="on-h1">Plus qu’une boutique, un univers.</h2>
        <p>
          Depuis 2012, O’Naturelle célèbre une approche authentique de la beauté, du
          bien-être et des traditions.
        </p>
      </div>
      <div className="on-image-frame">Image éditoriale</div>
    </section>
  );
}
