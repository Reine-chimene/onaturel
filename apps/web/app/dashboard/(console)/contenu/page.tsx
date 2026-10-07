"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CmsImageField } from "@/components/admin/CmsImageField";
import { ErrorNote } from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/admin/api";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content/defaults";
import { mergeSiteContent } from "@/lib/site-content/merge";
import type { SiteContent } from "@/lib/site-content/types";
import { invalidateSiteContentCache } from "@/lib/useSiteContent";

type Tab = "contact" | "home-hero" | "home-sections" | "histoire" | "boutique" | "seo";

export default function ContenuPage() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [tab, setTab] = useState<Tab>("home-hero");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    adminJson<SiteContent>("/api/v1/content")
      .then((data) => setContent(mergeSiteContent(data)))
      .catch((err: Error) => setError(err.message));
  }, []);

  async function saveSection(section: keyof SiteContent, label: string) {
    setError(null);
    setSaved(null);
    setPending(true);
    try {
      const data = await adminJson<SiteContent>("/api/v1/content", {
        method: "PATCH",
        body: JSON.stringify({ section, value: content[section] }),
      });
      setContent(mergeSiteContent(data));
      invalidateSiteContentCache();
      setSaved(label);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setPending(false);
    }
  }

  async function onContactSubmit(event: FormEvent) {
    event.preventDefault();
    await saveSection("contact", "Contact enregistré.");
    await saveSection("footer", "Pied de page enregistré.");
  }

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="on-label">Site public</p>
          <h1 className="on-h1">Contenu du site</h1>
          <p className="on-small">Modifiez textes et images sans développeur. Les changements apparaissent sur le site après enregistrement.</p>
        </div>
        <a className="on-btn on-btn--secondary" href="/" target="_blank" rel="noreferrer">
          Voir le site
        </a>
      </header>

      <div className="cms-tabs" role="tablist" aria-label="Sections du site">
        {[
          ["home-hero", "Accueil — Hero"],
          ["home-sections", "Accueil — Sections"],
          ["histoire", "Notre histoire"],
          ["contact", "Contact & pied de page"],
          ["boutique", "Boutique"],
          ["seo", "SEO Google"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`cms-tabs__btn${tab === id ? " is-active" : ""}`}
            onClick={() => setTab(id as Tab)}
          >
            {label}
          </button>
        ))}
      </div>

      <ErrorNote message={error} />
      {saved ? <p className="on-small cms-saved">{saved}</p> : null}

      {tab === "home-hero" ? (
        <form
          className="adm-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSection("home", "Page d’accueil enregistrée.");
          }}
        >
          <label className="on-field">
            <span>Bandeau du haut</span>
            <input
              className="on-input"
              value={content.home.topbar}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  home: { ...current.home, topbar: event.target.value },
                }))
              }
            />
          </label>
          <CmsImageField
            label="Image hero"
            value={content.home.hero.image}
            onChange={(image) =>
              setContent((current) => ({
                ...current,
                home: { ...current.home, hero: { ...current.home.hero, image } },
              }))
            }
          />
          <label className="on-field">
            <span>Marque</span>
            <input
              className="on-input"
              value={content.home.hero.brand}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  home: { ...current.home, hero: { ...current.home.hero, brand: event.target.value } },
                }))
              }
            />
          </label>
          <label className="on-field">
            <span>Titre principal</span>
            <input
              className="on-input"
              value={content.home.hero.title}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  home: { ...current.home, hero: { ...current.home.hero, title: event.target.value } },
                }))
              }
            />
          </label>
          <label className="on-field">
            <span>Titre (partie en italique)</span>
            <input
              className="on-input"
              value={content.home.hero.title_emphasis}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  home: {
                    ...current.home,
                    hero: { ...current.home.hero, title_emphasis: event.target.value },
                  },
                }))
              }
            />
          </label>
          <label className="on-field">
            <span>Sous-titre</span>
            <input
              className="on-input"
              value={content.home.hero.subtitle}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  home: { ...current.home, hero: { ...current.home.hero, subtitle: event.target.value } },
                }))
              }
            />
          </label>
          <div className="adm-form-grid">
            <label className="on-field">
              <span>Bouton principal</span>
              <input
                className="on-input"
                value={content.home.hero.cta_primary.label}
                onChange={(event) =>
                  setContent((current) => ({
                    ...current,
                    home: {
                      ...current.home,
                      hero: {
                        ...current.home.hero,
                        cta_primary: { ...current.home.hero.cta_primary, label: event.target.value },
                      },
                    },
                  }))
                }
              />
            </label>
            <label className="on-field">
              <span>Lien bouton principal</span>
              <input
                className="on-input"
                value={content.home.hero.cta_primary.href}
                onChange={(event) =>
                  setContent((current) => ({
                    ...current,
                    home: {
                      ...current.home,
                      hero: {
                        ...current.home.hero,
                        cta_primary: { ...current.home.hero.cta_primary, href: event.target.value },
                      },
                    },
                  }))
                }
              />
            </label>
          </div>
          <button className="on-btn on-btn--primary" type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer l’accueil"}
          </button>
        </form>
      ) : null}

      {tab === "home-sections" ? (
        <form
          className="adm-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSection("home", "Sections accueil enregistrées.");
          }}
        >
          <h2 className="on-h3">Cosmétique spirituelle</h2>
          <CmsImageField
            label="Image principale"
            value={content.home.spirit.images[0]}
            onChange={(image) =>
              setContent((current) => {
                const images = [...current.home.spirit.images] as typeof current.home.spirit.images;
                images[0] = image;
                return { ...current, home: { ...current.home, spirit: { ...current.home.spirit, images } } };
              })
            }
          />
          <label className="on-field">
            <span>Titre</span>
            <input
              className="on-input"
              value={content.home.spirit.title}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  home: { ...current.home, spirit: { ...current.home.spirit, title: event.target.value } },
                }))
              }
            />
          </label>
          <label className="on-field on-field--wide">
            <span>Texte</span>
            <textarea
              className="on-input"
              rows={4}
              value={content.home.spirit.text}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  home: { ...current.home, spirit: { ...current.home.spirit, text: event.target.value } },
                }))
              }
            />
          </label>

          <h2 className="on-h3 adm-form--section">Notre histoire (accueil)</h2>
          <CmsImageField
            label="Image"
            value={content.home.maison.image}
            onChange={(image) =>
              setContent((current) => ({
                ...current,
                home: { ...current.home, maison: { ...current.home.maison, image } },
              }))
            }
          />
          <label className="on-field">
            <span>Titre</span>
            <input
              className="on-input"
              value={content.home.maison.title}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  home: { ...current.home, maison: { ...current.home.maison, title: event.target.value } },
                }))
              }
            />
          </label>
          <label className="on-field on-field--wide">
            <span>Texte</span>
            <textarea
              className="on-input"
              rows={3}
              value={content.home.maison.text}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  home: { ...current.home, maison: { ...current.home.maison, text: event.target.value } },
                }))
              }
            />
          </label>

          <h2 className="on-h3 adm-form--section">Bloc contact</h2>
          <label className="on-field">
            <span>Titre</span>
            <input
              className="on-input"
              value={content.home.contact.title}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  home: { ...current.home, contact: { ...current.home.contact, title: event.target.value } },
                }))
              }
            />
          </label>
          <label className="on-field">
            <span>Sous-titre</span>
            <input
              className="on-input"
              value={content.home.contact.subtitle}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  home: { ...current.home, contact: { ...current.home.contact, subtitle: event.target.value } },
                }))
              }
            />
          </label>
          <button className="on-btn on-btn--primary" type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer les sections"}
          </button>
        </form>
      ) : null}

      {tab === "histoire" ? (
        <form
          className="adm-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSection("histoire", "Page histoire enregistrée.");
          }}
        >
          <CmsImageField
            label="Image hero"
            value={content.histoire.hero.image}
            onChange={(image) =>
              setContent((current) => ({
                ...current,
                histoire: { ...current.histoire, hero: { ...current.histoire.hero, image } },
              }))
            }
          />
          <label className="on-field">
            <span>Titre hero</span>
            <textarea
              className="on-input"
              rows={2}
              value={content.histoire.hero.title}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  histoire: { ...current.histoire, hero: { ...current.histoire.hero, title: event.target.value } },
                }))
              }
            />
          </label>
          <label className="on-field on-field--wide">
            <span>Introduction</span>
            <textarea
              className="on-input"
              rows={3}
              value={content.histoire.hero.lead}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  histoire: { ...current.histoire, hero: { ...current.histoire.hero, lead: event.target.value } },
                }))
              }
            />
          </label>
          <label className="on-field on-field--wide">
            <span>Bloc « Depuis 2012 »</span>
            <textarea
              className="on-input"
              rows={4}
              value={content.histoire.year.text}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  histoire: { ...current.histoire, year: { ...current.histoire.year, text: event.target.value } },
                }))
              }
            />
          </label>
          <label className="on-field on-field--wide">
            <span>Phrase signature</span>
            <input
              className="on-input"
              value={content.histoire.year.phrase}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  histoire: { ...current.histoire, year: { ...current.histoire.year, phrase: event.target.value } },
                }))
              }
            />
          </label>
          <label className="on-field on-field--wide">
            <span>Texte cosmétique spirituelle (1er paragraphe)</span>
            <textarea
              className="on-input"
              rows={4}
              value={content.histoire.spirit.paragraphs[0]}
              onChange={(event) =>
                setContent((current) => {
                  const paragraphs = [...current.histoire.spirit.paragraphs] as [string, string];
                  paragraphs[0] = event.target.value;
                  return {
                    ...current,
                    histoire: { ...current.histoire, spirit: { ...current.histoire.spirit, paragraphs } },
                  };
                })
              }
            />
          </label>
          <button className="on-btn on-btn--primary" type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer l’histoire"}
          </button>
        </form>
      ) : null}

      {tab === "boutique" ? (
        <form
          className="adm-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSection("boutique", "Boutique enregistrée.");
          }}
        >
          <CmsImageField
            label="Image hero boutique"
            value={content.boutique.image}
            onChange={(image) =>
              setContent((current) => ({
                ...current,
                boutique: { ...current.boutique, image },
              }))
            }
          />
          <label className="on-field">
            <span>Titre</span>
            <input
              className="on-input"
              value={content.boutique.title}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  boutique: { ...current.boutique, title: event.target.value },
                }))
              }
            />
          </label>
          <label className="on-field on-field--wide">
            <span>Texte d’introduction</span>
            <textarea
              className="on-input"
              rows={3}
              value={content.boutique.lead}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  boutique: { ...current.boutique, lead: event.target.value },
                }))
              }
            />
          </label>
          <button className="on-btn on-btn--primary" type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer la boutique"}
          </button>
        </form>
      ) : null}

      {tab === "seo" ? (
        <form
          className="adm-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSection("seo", "SEO enregistré.");
          }}
        >
          <label className="on-field">
            <span>Titre Google</span>
            <input
              className="on-input"
              value={content.seo.title}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  seo: { ...current.seo, title: event.target.value },
                }))
              }
            />
          </label>
          <label className="on-field on-field--wide">
            <span>Description Google</span>
            <textarea
              className="on-input"
              rows={3}
              value={content.seo.description}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  seo: { ...current.seo, description: event.target.value },
                }))
              }
            />
          </label>
          <CmsImageField
            label="Image de partage (Open Graph)"
            value={content.seo.og_image}
            onChange={(og_image) =>
              setContent((current) => ({
                ...current,
                seo: { ...current.seo, og_image },
              }))
            }
          />
          <button className="on-btn on-btn--primary" type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer le SEO"}
          </button>
        </form>
      ) : null}

      {tab === "contact" ? (
        <form className="adm-form" onSubmit={onContactSubmit}>
          <label className="on-field">
            <span>WhatsApp (numéro international, sans +)</span>
            <input
              className="on-input"
              value={content.contact.whatsapp_e164}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  contact: { ...current.contact, whatsapp_e164: event.target.value.replace(/\D/g, "") },
                }))
              }
            />
          </label>
          <label className="on-field">
            <span>WhatsApp (affichage)</span>
            <input
              className="on-input"
              value={content.contact.whatsapp_display}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  contact: { ...current.contact, whatsapp_display: event.target.value },
                }))
              }
            />
          </label>
          <label className="on-field">
            <span>Horaires</span>
            <input
              className="on-input"
              value={content.contact.hours}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  contact: { ...current.contact, hours: event.target.value },
                }))
              }
            />
          </label>
          <label className="on-field on-field--wide">
            <span>Phrase pied de page</span>
            <input
              className="on-input"
              value={content.footer.tagline}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  footer: { ...current.footer, tagline: event.target.value },
                }))
              }
            />
          </label>
          <label className="on-field on-field--wide">
            <span>Ligne de copyright</span>
            <input
              className="on-input"
              value={content.footer.base_line}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  footer: { ...current.footer, base_line: event.target.value },
                }))
              }
            />
          </label>
          <button className="on-btn on-btn--primary" type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer contact & pied de page"}
          </button>
        </form>
      ) : null}
    </>
  );
}
