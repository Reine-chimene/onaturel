"use client";

import { CartDrawer } from "@/components/commerce/CartDrawer";
import { ZoneSwitchDialog } from "@/components/commerce/ZoneSwitchDialog";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";
import { renderLines } from "@/lib/site-content/render";
import { usePublicSession } from "@/lib/usePublicSession";
import { useSiteContent, whatsappHref } from "@/lib/useSiteContent";
import "@/styles/home.css";
import "@/styles/histoire.css";

const UNIVERSES = [
  { title: "Cosmétique spirituelle", kicker: "Univers central", featured: true },
  { title: "Cosmétique bio", kicker: "Soin", featured: false },
  { title: "Plantes & épices", kicker: "Terre", featured: false },
  { title: "Huiles", kicker: "Matière", featured: false },
  { title: "Poudres indiennes", kicker: "Geste", featured: false },
  { title: "Savons & gommages", kicker: "Rituel", featured: false },
  { title: "Rituels", kicker: "Temps", featured: false },
  { title: "Parfums", kicker: "Sillage", featured: false },
  { title: "Sacs & accessoires", kicker: "Forme", featured: false },
] as const;

export function HistoirePage() {
  const {
    zone,
    onZone,
    pendingZone,
    confirmZone,
    cancelZone,
    cartOpen,
    setCartOpen,
    lines,
    onQuantity,
    remove,
  } = usePublicSession();
  const { content } = useSiteContent();
  const { histoire, contact } = content;
  const waHref = whatsappHref(contact.whatsapp_e164);

  const featured = UNIVERSES.filter((item) => item.featured);
  const others = UNIVERSES.filter((item) => !item.featured);

  return (
    <div className="home histoire">
      <SiteHeader zone={zone} onZone={onZone} onCart={() => setCartOpen(true)} />

      <section className="hist-hero" aria-labelledby="hist-hero-title">
        <img className="hist-hero__img" src={histoire.hero.image.url ?? "/images/look-bio.jpg"} alt={histoire.hero.image.alt ?? ""} />
        <p className="hist-hero__ghost" aria-hidden="true">
          {histoire.hero.ghost}
        </p>
        <div className="hist-hero__copy home-reveal">
          <p className="on-label hist-hero__label">{histoire.hero.label}</p>
          <h1 id="hist-hero-title">{renderLines(histoire.hero.title)}</h1>
          <hr className="home-gold-rule" />
          <p className="hist-hero__lead">{histoire.hero.lead}</p>
        </div>
      </section>

      <section className="hist-year" aria-labelledby="hist-year-title">
        <p className="hist-year__mark" aria-hidden="true">
          {histoire.year.mark}
        </p>
        <div className="hist-year__copy">
          <p className="on-label">{histoire.year.label}</p>
          <h2 id="hist-year-title">{histoire.year.title}</h2>
          <hr className="home-gold-rule" />
          <p>{histoire.year.text}</p>
          <p className="hist-year__phrase">{histoire.year.phrase}</p>
        </div>
      </section>

      <section className="hist-body" aria-labelledby="hist-body-title">
        <div className="hist-body__intro">
          <p className="on-label" style={{ color: "var(--gold)" }}>
            {histoire.body.label}
          </p>
          <h2 id="hist-body-title">{histoire.body.title}</h2>
          <hr className="home-gold-rule" />
          <p>{histoire.body.text}</p>
        </div>
        <ul className="hist-pillars">
          {histoire.body.pillars.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="hist-spirit" aria-labelledby="hist-spirit-title">
        <div className="hist-spirit__main">
          <p className="on-label">{histoire.spirit.label}</p>
          <h2 id="hist-spirit-title">{histoire.spirit.title}</h2>
          <hr className="home-gold-rule" />
          <p>{histoire.spirit.paragraphs[0]}</p>
          <p>{histoire.spirit.paragraphs[1]}</p>
        </div>
        <aside className="hist-spirit__aside">
          {histoire.spirit.aside.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </aside>
      </section>

      <section className="hist-univers" aria-labelledby="hist-univers-title">
        <div className="hist-univers__head">
          <p className="on-label">Les univers</p>
          <h2 id="hist-univers-title">Toute la maison, un même geste.</h2>
        </div>
        <div className="hist-univers__layout">
          {featured.map((item) => (
            <article key={item.title} className="hist-featured">
              <span>{item.kicker}</span>
              <strong>{item.title}</strong>
              <p>Le cœur de l’approche O’Naturelle : le soin comme rituel, entre corps et esprit.</p>
            </article>
          ))}
          <ol className="hist-index">
            {others.map((item, index) => (
              <li key={item.title}>
                <em>{String(index + 1).padStart(2, "0")}</em>
                <span>{item.kicker}</span>
                <strong>{item.title}</strong>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="hist-guide" aria-labelledby="hist-guide-title">
        <div>
          <p className="on-label" style={{ color: "var(--gold)" }}>
            {histoire.guide.label}
          </p>
          <h2 id="hist-guide-title">{histoire.guide.title}</h2>
          <hr className="home-gold-rule" />
          <p>{histoire.guide.text}</p>
          <a className="on-btn on-btn--secondary hist-guide__btn" href={waHref}>
            {histoire.guide.cta_label}
          </a>
          <p className="hist-guide__tel">
            <a href={waHref}>{contact.whatsapp_display}</a>
          </p>
        </div>
      </section>

      <section className="hist-close" aria-labelledby="hist-close-title">
        <h2 id="hist-close-title">
          {histoire.close.lines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </h2>
        <hr className="home-gold-rule" style={{ marginInline: "auto" }} />
        <p>{histoire.close.text}</p>
        <a className="on-btn on-btn--primary" href={histoire.close.cta.href}>
          {histoire.close.cta.label}
        </a>
      </section>

      <SiteFooter />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={lines}
        onQuantity={onQuantity}
        onRemove={remove}
      />
      {pendingZone ? (
        <ZoneSwitchDialog current={zone} next={pendingZone} onConfirm={confirmZone} onCancel={cancelZone} />
      ) : null}
    </div>
  );
}
