"use client";

import Link from "next/link";
import { useSiteContent, whatsappHref } from "@/lib/useSiteContent";

export function SiteFooter() {
  const { content } = useSiteContent();
  const { contact, footer } = content;
  const waHref = whatsappHref(contact.whatsapp_e164);

  return (
    <footer className="home-footer">
      <div className="home-footer__grid">
        <div>
          <p className="home-footer__mark">O’Naturelle</p>
          <p>{footer.tagline}</p>
        </div>
        <div>
          <p className="on-label" style={{ color: "var(--gold)" }}>
            Maison
          </p>
          <p>
            <Link href="/">Accueil</Link>
          </p>
          <p>
            <Link href="/boutique?categorie=cosmetique-classique">Cosmétique classique</Link>
          </p>
          <p>
            <Link href="/boutique?categorie=produits-capillaires">Produits capillaires</Link>
          </p>
          <p>
            <Link href="/boutique?categorie=gommages">Gommages</Link>
          </p>
          <p>
            <Link href="/notre-histoire">Notre Histoire</Link>
          </p>
        </div>
        <div>
          <p className="on-label" style={{ color: "var(--gold)" }}>
            Univers
          </p>
          <p>
            <Link href="/boutique?categorie=diete">Diète</Link>
          </p>
          <p>
            <Link href="/boutique?categorie=divers">Divers</Link>
          </p>
          <p>
            <Link href="/boutique?categorie=produits-spirituels-intense">Produits spirituels</Link>
          </p>
          <p>
            <Link href="/boutique?categorie=sacs-accessoires">Sacs & accessoires</Link>
          </p>
          <p>
            <Link href="/boutique?categorie=parfums">Parfums</Link>
          </p>
          <p>
            <Link href="/#contact">Contact</Link>
          </p>
        </div>
        <div>
          <p className="on-label" style={{ color: "var(--gold)" }}>
            WhatsApp
          </p>
          <p>
            <a href={waHref}>{contact.whatsapp_display}</a>
          </p>
          <p>{contact.hours}</p>
        </div>
      </div>
      <p className="home-footer__base">{footer.base_line}</p>
    </footer>
  );
}
