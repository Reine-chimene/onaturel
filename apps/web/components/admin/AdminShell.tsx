"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { fetchMe, isOwnerRole, logout } from "@/lib/admin/api";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: "home" },
  { href: "/dashboard/commandes", label: "Commandes", icon: "orders" },
  { href: "/dashboard/produits", label: "Produits", icon: "box" },
  { href: "/dashboard/stock", label: "Stock", icon: "stock" },
  { href: "/dashboard/promotions", label: "Promotions", icon: "tag" },
  { href: "/dashboard/packs", label: "Packs", icon: "pack" },
  { href: "/dashboard/ventes", label: "Ventes", icon: "chart" },
  { href: "/dashboard/categories", label: "Catégories", icon: "list" },
  { href: "/dashboard/zones", label: "Zones", icon: "pin" },
  { href: "/dashboard/contenu", label: "Contenu", icon: "content" },
  { href: "/dashboard/parametres", label: "Paramètres", icon: "gear" },
] as const;

function NavIcon({ name }: { name: (typeof NAV)[number]["icon"] }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, "aria-hidden": true } as const;
  if (name === "home") return <svg {...common}><path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></svg>;
  if (name === "orders") return <svg {...common}><path d="M7 4h10l1 16H6L7 4z" /><path d="M9 9h6M9 13h6" /></svg>;
  if (name === "box") return <svg {...common}><path d="M4 8 12 4l8 4-8 4-8-4z" /><path d="M4 8v8l8 4 8-4V8" /><path d="M12 12v8" /></svg>;
  if (name === "stock") return <svg {...common}><path d="M4 19V9h4v10H4zm6 0V5h4v14h-4zm6 0v-7h4v7h-4z" /></svg>;
  if (name === "tag") return <svg {...common}><path d="M4 12 12 4h8v8l-8 8z" /><circle cx="16" cy="8" r="1.2" /></svg>;
  if (name === "pack") return <svg {...common}><rect x="4" y="7" width="16" height="13" rx="1" /><path d="M8 7V5h8v2" /></svg>;
  if (name === "chart") return <svg {...common}><path d="M5 19V9M12 19V5M19 19v-7" /></svg>;
  if (name === "list") return <svg {...common}><path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" /></svg>;
  if (name === "pin") return <svg {...common}><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2" /></svg>;
  if (name === "content") return <svg {...common}><path d="M5 5h14v14H5z" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 4v2M12 18v2M4 12h2M18 12h2" /></svg>;
}

function isCurrent(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [gate, setGate] = useState<"pending" | "ok" | "denied">("pending");
  const [name, setName] = useState("O’Naturelle");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (cancelled) return;
        if (!isOwnerRole(me.role)) {
          setGate("denied");
          return;
        }
        setName(me.full_name || "O’Naturelle");
        setGate("ok");
      })
      .catch(() => {
        if (!cancelled) router.replace("/?manager=1");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function onLogout() {
    await logout();
    router.replace("/");
  }

  return (
    <div className={`on-dash${menuOpen ? " is-open" : ""}`}>
      {menuOpen ? (
        <button type="button" className="on-dash__backdrop" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)} />
      ) : null}
      <aside className="on-dash__side" aria-label="Navigation propriétaire">
        <p className="on-logo on-dash__mark">
          O’Naturelle
        </p>
        <p className="on-dash__group">Propriétaire</p>
        <nav className="on-dash__nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <Link className="adm-logout" href="/">
          Voir le site
        </Link>
        <button type="button" className="adm-logout" onClick={onLogout}>
          Déconnexion
        </button>
      </aside>
      <div className="on-dash__main">
        <header className="on-dash__bar">
          <button type="button" className="on-dash__menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            Menu
          </button>
          <p className="on-logo on-dash__mark-bar">
            O’Naturelle
          </p>
        </header>
        <div className="adm-page">
          {gate === "denied" ? (
            <div className="adm-denied">
              <p className="on-h2">Accès refusé</p>
              <p className="on-body">Cet espace est réservé à la propriétaire.</p>
              <button
                type="button"
                className="on-btn on-btn--primary"
                onClick={() => {
                  void logout().then(() => router.replace("/?manager=1"));
                }}
              >
                Retour à la connexion
              </button>
            </div>
          ) : (
            <>
              <p className="visually-hidden">Connectée en tant que {name}</p>
              {children}
            </>
          )}
        </div>
      </div>
      {gate === "pending" ? (
        <div className="on-dash__gate" role="status">
          <p className="on-small">Chargement…</p>
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="adm-empty">
      <p className="on-h3">{title}</p>
      {text ? <p className="on-small">{text}</p> : null}
      {children}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="on-field__error">{message}</p>;
}
