"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ManagerLoginPanel } from "@/components/public/ManagerLoginPanel";
import { ZonePicker, type ZoneId } from "@/components/public/ZonePicker";
import { getAccessToken, getStoredRole, isOwnerRole } from "@/lib/admin/api";
import { NAV_DESKTOP, PUBLIC_NAV } from "@/lib/nav";
import { universeOf } from "@/lib/univers";
import { fetchShop, type PublicProduct } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { useSiteContent, whatsappHref } from "@/lib/useSiteContent";

function isCurrent(href: string, pathname: string, category: string | null) {
  if (href === "/") return pathname === "/";
  if (href === "/notre-histoire") return pathname === "/notre-histoire";
  if (href === "/#contact") return false;
  if (href === "/boutique") return pathname === "/boutique" && !category;
  if (href.startsWith("/boutique?categorie=")) {
    const slug = href.split("categorie=")[1];
    const current = universeOf(category)?.slug ?? category;
    const target = universeOf(slug)?.slug ?? slug;
    return pathname === "/boutique" && current === target;
  }
  return href === pathname;
}

export function SiteHeader({
  zone,
  onZone,
  onCart,
  forceSolid = false,
  overlay = false,
}: {
  zone: ZoneId;
  onZone: (zone: ZoneId) => void;
  onCart: () => void;
  forceSolid?: boolean;
  overlay?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("categorie");
  const [compact, setCompact] = useState(false);
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const { content } = useSiteContent();
  const waHref = whatsappHref(content.contact.whatsapp_e164);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PublicProduct[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    setMenu(false);
    setSearchOpen(false);
    setManagerOpen(false);
  }, [pathname, category]);

  useEffect(() => {
    if (searchParams.get("manager") === "1") {
      setManagerOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  useEffect(() => {
    document.body.style.overflow = menu || searchOpen || managerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu, searchOpen, managerOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    searchRef.current?.focus();
    let cancelled = false;
    fetchShop(zone).then((shop) => {
      if (cancelled || !shop) {
        setHits([]);
        return;
      }
      const needle = query.trim().toLowerCase();
      const list = needle
        ? shop.products.filter((item) => item.name.toLowerCase().includes(needle))
        : shop.products.slice(0, 6);
      setHits(list.slice(0, 8));
    });
    return () => {
      cancelled = true;
    };
  }, [searchOpen, query, zone]);

  const openSearch = () => {
    setMenu(false);
    setSearchOpen(true);
  };

  const openManager = () => {
    setMenu(false);
    setSearchOpen(false);
    if (getAccessToken() && isOwnerRole(getStoredRole())) {
      router.push("/dashboard");
      return;
    }
    setManagerOpen(true);
  };

  const closeManager = () => setManagerOpen(false);

  return (
    <header
      className={`home-header ${overlay ? "home-header--overlay" : ""} ${compact || forceSolid ? "is-compact" : ""} ${menu || searchOpen || managerOpen ? "is-open" : ""}`}
    >
      <div className="home-header__brand">
        <Link className="home-logo" href="/">
          <img src="/images/logo.png" alt="O’Naturelle" width={160} height={160} />
        </Link>
        <div className="home-header__tools">
          <button
            type="button"
            className="home-icon-btn home-search-btn"
            aria-label="Rechercher"
            aria-expanded={searchOpen}
            onClick={() => {
              setMenu(false);
              setSearchOpen((value) => !value);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
          <ZonePicker zone={zone} onZone={onZone} />
          <button type="button" className="home-icon-btn" onClick={onCart} aria-label="Panier">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 7h15l-1.4 8.2a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.7L5.2 4.8H3" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="10" cy="19" r="1.2" fill="currentColor" />
              <circle cx="17" cy="19" r="1.2" fill="currentColor" />
            </svg>
          </button>
          <a className="home-icon-btn home-wa" href={waHref} aria-label="WhatsApp">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3.2A8.3 8.3 0 0 0 5.1 15.7L4 20l4.4-1.1A8.3 8.3 0 1 0 12 3.2Z"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M9.2 9.4c.2-.5.4-.5.7-.5h.6c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.2.7l-.4.4c-.1.2 0 .4.2.7.4.5.9 1 1.5 1.4.3.2.5.2.7 0l.5-.5c.2-.2.5-.2.7 0l1.4.8c.3.2.4.4.3.7-.2.7-1.1 1.5-1.8 1.5-3.2 0-6.6-3.5-6.6-6.6 0-.5.3-1.2.7-1.6Z"
                fill="currentColor"
              />
            </svg>
          </a>
          <button type="button" className="home-manager-btn" onClick={openManager}>
            Manager
          </button>
          <button
            type="button"
            className="home-icon-btn home-burger"
            aria-label="Menu"
            aria-expanded={menu}
            onClick={() => {
              setSearchOpen(false);
              setMenu((value) => !value);
            }}
          >
            <i />
            <i />
            <i />
          </button>
        </div>
      </div>
      <nav className="home-nav" aria-label="Navigation principale">
        {NAV_DESKTOP.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isCurrent(item.href, pathname, category) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {searchOpen ? (
        <div className="home-search" role="dialog" aria-label="Recherche">
          <label className="home-search__field">
            <span className="visually-hidden">Rechercher un produit</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un soin, un rituel…"
            />
          </label>
          {hits.length === 0 ? (
            <p className="home-search__empty">Aucun produit pour cette recherche.</p>
          ) : (
            <ul className="home-search__list">
              {hits.map((item) => (
                <li key={item.id}>
                  <Link href={`/boutique/${item.slug}`} onClick={() => setSearchOpen(false)}>
                    <span>{item.name}</span>
                    <strong>{formatMoney(item.promo_price ?? item.price, item.currency_code)}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link className="home-search__all" href="/boutique" onClick={() => setSearchOpen(false)}>
            Voir la boutique
          </Link>
        </div>
      ) : null}
      {menu ? (
        <>
          <button
            type="button"
            className="home-panel__scrim"
            aria-label="Fermer le menu"
            onClick={() => setMenu(false)}
          />
          <div className="home-panel" role="dialog" aria-label="Menu">
            <p className="home-panel__title">Univers</p>
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                aria-current={isCurrent(item.href, pathname, category) ? "page" : undefined}
                onClick={() => setMenu(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="home-panel__zone">
              <button type="button" className="home-panel__wa" onClick={openSearch}>
                Recherche
              </button>
              <ZonePicker zone={zone} onZone={onZone} variant="panel" />
              <button
                type="button"
                className="home-panel__wa"
                onClick={() => {
                  setMenu(false);
                  onCart();
                }}
              >
                Panier
              </button>
              <a className="home-panel__wa" href={waHref} onClick={() => setMenu(false)}>
                WhatsApp
              </a>
              <button type="button" className="home-panel__wa" onClick={openManager}>
                Manager
              </button>
            </div>
          </div>
        </>
      ) : null}
      <ManagerLoginPanel open={managerOpen} onClose={closeManager} />
    </header>
  );
}
