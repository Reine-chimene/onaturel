"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CartDrawer } from "@/components/commerce/CartDrawer";
import { ZoneSwitchDialog } from "@/components/commerce/ZoneSwitchDialog";
import { HomePackCard, HomeProductCard } from "@/components/home/HomeProductCard";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";
import { fetchShop, type PublicCategory, type PublicPack, type PublicProduct } from "@/lib/catalog";
import { universePhoto } from "@/lib/univers-images";
import { renderLines } from "@/lib/site-content/render";
import { usePublicSession } from "@/lib/usePublicSession";
import { useSiteContent, whatsappHref } from "@/lib/useSiteContent";
import { UNIVERSES } from "@/lib/univers";
import "@/styles/home.css";

function byCategory(products: PublicProduct[], slugs: string[]) {
  return products.filter((item) => item.category_slug && slugs.includes(item.category_slug));
}

export function HomePage() {
  const {
    zone,
    onZone,
    hydrated,
    pendingZone,
    confirmZone,
    cancelZone,
    cartOpen,
    setCartOpen,
    lines,
    onQuantity,
    remove,
  } = usePublicSession();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [packs, setPacks] = useState<PublicPack[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const { content } = useSiteContent();
  const { home, contact } = content;
  const waHref = whatsappHref(contact.whatsapp_e164);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    fetchShop(zone).then((shop) => {
      if (cancelled || !shop) {
        setProducts([]);
        setPacks([]);
        setCategories([]);
        return;
      }
      setProducts(shop.products);
      setPacks(shop.packs);
      setCategories(shop.categories);
    });
    return () => {
      cancelled = true;
    };
  }, [zone, hydrated]);

  const featured = products.filter((item) => item.is_featured);
  const picks = (featured.length > 0 ? featured : products).slice(0, 3);
  const nouveautes = products.filter((item) => item.is_new).slice(0, 4);
  const promotions = products.filter((item) => item.promo_active && item.promo_price != null).slice(0, 4);
  const spirituelle = byCategory(products, ["produits-spirituels-intense"]).slice(0, 3);
  const gommages = byCategory(products, ["gommages"]).slice(0, 3);

  return (
    <div className="home">
      <div className="home-stage">
        <p className="home-topbar">{home.topbar}</p>
        <SiteHeader overlay zone={zone} onZone={onZone} onCart={() => setCartOpen(true)} />

        <section className="home-hero" id="accueil" aria-label="O’Naturelle">
          <figure className="home-hero__visual">
            <img
              src={home.hero.image.url ?? "/images/hero-woman.png"}
              alt={home.hero.image.alt ?? ""}
              width={1600}
              height={900}
            />
          </figure>
          <div className="home-hero__copy home-reveal">
            <p className="home-hero__brand">{home.hero.brand}</p>
            <h1>
              {home.hero.title}
              <br />
              <em>{home.hero.title_emphasis}</em>
            </h1>
            <p className="home-hero__line">{home.hero.subtitle}</p>
            <div className="home-hero__actions">
              <a className="on-btn on-btn--primary" href={home.hero.cta_primary.href}>
                {home.hero.cta_primary.label}
              </a>
              <a className="on-btn on-btn--secondary" href={home.hero.cta_secondary.href}>
                {home.hero.cta_secondary.label}
              </a>
            </div>
          </div>
        </section>
      </div>

      <section className="home-stars" id="incontournables">
        <div className="home-stars__head">
          <h2>{home.incontournables.title}</h2>
        </div>
        <div className="home-track">
          <Link className="home-lookcard" href={home.incontournables.card.href}>
            <img src={home.incontournables.card.image.url ?? "/images/soin-savon.jpg"} alt={home.incontournables.card.image.alt ?? ""} />
            <h3>{renderLines(home.incontournables.card.title)}</h3>
            <p>{home.incontournables.card.text}</p>
            <span>{home.incontournables.card.link_label}</span>
          </Link>
          {picks.length > 0
            ? picks.map((item) => <HomeProductCard key={item.id} product={item} />)
            : UNIVERSES.slice(0, 3).map((item) => (
                <Link key={item.slug} className="home-track__shot" href={`/boutique?categorie=${item.slug}`}>
                  <img src={universePhoto(item, categories)} alt="" />
                  <span>{item.kicker}</span>
                  <strong>{item.name}</strong>
                </Link>
              ))}
        </div>
      </section>

      <section className="home-univers" id="univers">
        <div className="home-univers__head">
          <h2>{home.univers.title}</h2>
          <p>{home.univers.lead}</p>
        </div>
        <div className="home-looks">
          {UNIVERSES.map((item) => (
            <Link key={item.slug} className="home-look home-look--photo" href={`/boutique?categorie=${item.slug}`}>
              <img src={universePhoto(item, categories)} alt="" />
              <span>{item.kicker}</span>
              <strong>{item.name}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-spirit" id="spirituelle">
        <div className="home-spirit__copy">
          <p className="on-label" style={{ color: "var(--gold-dim)" }}>
            {home.spirit.label}
          </p>
          <h2>{home.spirit.title}</h2>
          <p>{home.spirit.text}</p>
          <Link className="on-btn on-btn--secondary" href={home.spirit.cta.href}>
            {home.spirit.cta.label}
          </Link>
        </div>
        <div className="home-spirit__mosaic">
          <figure className="home-spirit__shot home-spirit__shot--main">
            <img src={home.spirit.images[0].url ?? "/images/spirit-water.jpg"} alt={home.spirit.images[0].alt ?? ""} />
          </figure>
          <figure className="home-spirit__shot">
            <img src={home.spirit.images[1].url ?? "/images/spirit-smudge.jpg"} alt={home.spirit.images[1].alt ?? ""} />
          </figure>
          <figure className="home-spirit__shot">
            <img src={home.spirit.images[2].url ?? "/images/spirit-leaves.jpg"} alt={home.spirit.images[2].alt ?? ""} />
          </figure>
        </div>
        {spirituelle.length > 0 ? (
          <div className="home-spirit__rail">
            {spirituelle.map((item) => (
              <HomeProductCard key={item.id} product={item} />
            ))}
          </div>
        ) : null}
      </section>

      {nouveautes.length > 0 ? (
        <section className="home-shop" id="nouveautes">
          <div className="home-shop__head">
            <h2>Nos nouveautés</h2>
          </div>
          <div className="home-rail">
            {nouveautes.map((item) => (
              <HomeProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      {promotions.length > 0 ? (
        <section className="home-shop" id="promotions">
          <div className="home-shop__head">
            <h2>Les offres du moment</h2>
          </div>
          <div className="home-rail">
            {promotions.map((item) => (
              <HomeProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      {packs.length > 0 ? (
        <section className="home-shop home-shop--cream" id="packs">
          <div className="home-shop__inner">
            <div className="home-shop__head">
              <h2>Nos packs</h2>
            </div>
            <div className="home-rail">
              {packs.map((item) => (
                <HomePackCard key={item.id} pack={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="home-rituals" id="rituels">
        <div className="home-rituals__intro">
          <h2>{home.rituals.title}</h2>
          <Link className="home-rituals__link" href={home.rituals.link.href}>
            {home.rituals.link.label}
          </Link>
        </div>
      </section>

      <section className="home-split" id="parfums">
        <Link className="home-split__block home-split__block--parfums" href={home.split.left.href}>
          <img src={home.split.left.image.url ?? "/images/savons-main.jpg"} alt={home.split.left.image.alt ?? ""} />
          <span>{home.split.left.kicker}</span>
          <strong>{home.split.left.title}</strong>
        </Link>
        <Link className="home-split__block home-split__block--sacs" href={home.split.right.href} id="sacs">
          <img src={home.split.right.image.url ?? "/images/spirit-smudge.jpg"} alt={home.split.right.image.alt ?? ""} />
          <span>{home.split.right.kicker}</span>
          <strong>{home.split.right.title}</strong>
        </Link>
      </section>
      {gommages.length > 0 ? (
        <section className="home-shop">
          <div className="home-rail">
            {gommages.map((item) => (
              <HomeProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="home-maison" id="histoire">
        <figure className="home-maison__photo">
          <img src={home.maison.image.url ?? "/images/maison-jars.jpg"} alt={home.maison.image.alt ?? ""} width={720} height={960} />
        </figure>
        <div className="home-maison__copy">
          <p className="home-maison__since">{home.maison.since}</p>
          <h2>{home.maison.title}</h2>
          <p>{home.maison.text}</p>
          <Link className="on-btn on-btn--secondary" href={home.maison.cta.href}>
            {home.maison.cta.label}
          </Link>
        </div>
      </section>

      <section className="home-suivi" id="contact">
        <h2>{home.contact.title}</h2>
        <p>{home.contact.subtitle}</p>
        <a className="on-btn on-btn--primary" href={waHref}>
          {home.contact.cta_label}
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
