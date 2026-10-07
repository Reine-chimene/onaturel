"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { Modal, Skeleton, Toast, EmptyState } from "@/components/ui/Feedback";
import { StatusBadge, PromotionBadge } from "@/components/ui/StatusBadge";
import { ProductCard, ProductPrice } from "@/components/commerce/ProductCard";
import {
  Breadcrumb,
  FilterChips,
  ProductGallery,
  QuantitySelector,
  WhatsAppCTA,
} from "@/components/commerce/ProductTools";
import { CartDrawer, type CartLine } from "@/components/commerce/CartDrawer";
import {
  EditorialSection,
  HeroPlaceholder,
  PublicFooter,
  PublicHeader,
} from "@/components/public/PublicChrome";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PosShell } from "@/components/pos/PosShell";

const SWATCHES = [
  ["background", "#f6f1e8"],
  ["surface", "#fbf8f3"],
  ["surface-muted", "#e8dcc8"],
  ["text-primary", "#3f2e22"],
  ["text-secondary", "#6a5748"],
  ["brand-primary", "#1b3329"],
  ["brand-secondary", "#4e6a4e"],
  ["accent", "#c4a574"],
  ["border", "#d9cbb6"],
  ["success", "#3d5c45"],
  ["warning", "#9a6b2f"],
  ["danger", "#7a3b2e"],
];

export default function DesignSystemPage() {
  const [zone, setZone] = useState<"cameroun" | "europe">("cameroun");
  const [dashZone, setDashZone] = useState<"all" | "cameroun" | "europe">("all");
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState(1);
  const [filter, setFilter] = useState("Tous");
  const [cartOpen, setCartOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [lines, setLines] = useState<CartLine[]>([
    { id: "a", kind: "product", slug: "produit-exemple-a", name: "Produit exemple A", quantity: 1, unitPrice: 8000, currency: "XAF", max: 9 },
  ]);
  const currency = zone === "cameroun" ? "XAF" : "EUR";
  const price = zone === "cameroun" ? 8000 : 1500;
  const promo = zone === "cameroun" ? 6500 : 1200;

  return (
    <div className="on-ds">
      <nav className="on-ds__nav" aria-label="Sections du design system">
        {[
          ["#tokens", "Tokens"],
          ["#type", "Typographie"],
          ["#buttons", "Boutons"],
          ["#status", "États métier"],
          ["#forms", "Formulaires"],
          ["#commerce", "E-commerce"],
          ["#public", "Site public"],
          ["#dashboard", "Dashboard"],
          ["#pos", "POS"],
        ].map(([href, label]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </nav>
      <div className="on-ds__content">
        <p className="on-label">Phase 3 · développement uniquement</p>
        <h1 className="on-display">Système visuel O’Naturelle</h1>
        <p className="on-small">
          Cette page n’est pas le site public. Elle sert à valider l’identité commune aux trois
          surfaces avant la homepage.
        </p>

        <section id="tokens" className="on-ds__section">
          <h2 className="on-h2">Palette</h2>
          <div className="on-ds__row" style={{ marginTop: "1rem" }}>
            {SWATCHES.map(([name, hex]) => (
              <div className="on-swatch" key={name}>
                <i style={{ background: hex }} />
                <span className="on-small">{name}</span>
                <span className="on-small">{hex}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="type" className="on-ds__section">
          <h2 className="on-h2">Typographie</h2>
          <p className="on-display">Display — Cormorant Garamond</p>
          <h1 className="on-h1">Titre H1</h1>
          <h2 className="on-h2">Titre H2</h2>
          <h3 className="on-h3">Titre H3</h3>
          <p className="on-body">Body — Figtree. Nous prenons soin de votre corps et de votre esprit.</p>
          <p className="on-small">Small · légendes et aides</p>
          <p className="on-label">Label</p>
          <p className="on-price">8 000 FCFA</p>
        </section>

        <section id="buttons" className="on-ds__section">
          <h2 className="on-h2">Boutons</h2>
          <div className="on-ds__row" style={{ marginTop: "1rem" }}>
            <Button>Primaire</Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="ghost">Fantôme</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Désactivé</Button>
          </div>
        </section>

        <section id="status" className="on-ds__section">
          <h2 className="on-h2">États métier</h2>
          <div className="on-ds__row" style={{ marginTop: "1rem" }}>
            <StatusBadge kind="stock" value="IN_STOCK" />
            <StatusBadge kind="stock" value="LOW_STOCK" />
            <StatusBadge kind="stock" value="OUT_OF_STOCK" />
            <StatusBadge kind="order" value="NEW" />
            <StatusBadge kind="order" value="CONFIRMED" />
            <StatusBadge kind="order" value="PREPARING" />
            <StatusBadge kind="order" value="READY" />
            <StatusBadge kind="order" value="DELIVERED" />
            <StatusBadge kind="order" value="CANCELLED" />
            <StatusBadge kind="payment" value="PAID" />
            <StatusBadge kind="payment" value="PENDING" />
            <StatusBadge kind="payment" value="PARTIAL" />
            <StatusBadge kind="fulfillment" value="DELIVERY" />
            <StatusBadge kind="fulfillment" value="SHIPPING" />
            <StatusBadge kind="fulfillment" value="PICKUP" />
            <StatusBadge kind="tag" value="NEW" />
            <PromotionBadge percent={20} />
          </div>
        </section>

        <section id="forms" className="on-ds__section">
          <h2 className="on-h2">Formulaires</h2>
          <div style={{ maxWidth: 360, display: "grid", gap: "1rem", marginTop: "1rem" }}>
            <Field id="nom" label="Nom et prénom">
              <TextInput id="nom" placeholder="Marie Dupont" />
            </Field>
            <Field id="tel" label="Téléphone" error="Indiquez un numéro joignable.">
              <TextInput id="tel" aria-invalid="true" />
            </Field>
            <Field id="mode" label="Mode de réception" hint="Selon la zone active">
              <Select id="mode" defaultValue="DELIVERY">
                <option value="DELIVERY">Livraison</option>
                <option value="SHIPPING">Expédition</option>
                <option value="PICKUP">Retrait</option>
              </Select>
            </Field>
          </div>
        </section>

        <section id="commerce" className="on-ds__section">
          <h2 className="on-h2">E-commerce</h2>
          <Breadcrumb items={[{ href: "#", label: "Accueil" }, { label: "Boutique" }]} />
          <div style={{ margin: "1rem 0" }}>
            <FilterChips options={["Tous", "Nouveautés", "Promotions"]} value={filter} onChange={setFilter} />
          </div>
          <ProductPrice currency={currency} price={price} promoPrice={promo} />
          <QuantitySelector value={qty} onChange={setQty} />
          <div style={{ margin: "1rem 0" }}>
            <WhatsAppCTA />
          </div>
          <div className="on-grid-demo">
            <ProductCard
              name="Produit exemple A"
              category="Huiles végétales"
              currency={currency}
              price={price}
              isNew
              stock="IN_STOCK"
            />
            <ProductCard
              name="Produit exemple B"
              category="Savons"
              currency={currency}
              price={price}
              promoPrice={promo}
              stock="LOW_STOCK"
            />
            <ProductCard
              name="Produit exemple C"
              category="Rituels"
              currency={currency}
              price={price}
              stock="OUT_OF_STOCK"
            />
          </div>
          <div style={{ maxWidth: 320, marginTop: "2rem" }}>
            <ProductGallery alts={["Vue 1", "Vue 2", "Vue 3"]} />
          </div>
          <div className="on-ds__row" style={{ marginTop: "1rem" }}>
            <Button onClick={() => setCartOpen(true)}>Ouvrir le panier</Button>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Dialogue de confirmation
            </Button>
            <Button variant="ghost" onClick={() => setToast("Commande enregistrée.")}>
              Toast
            </Button>
          </div>
          <EmptyState title="Aucun produit" text="Aucun article dans cette zone pour le moment." />
          <Skeleton height={48} />
        </section>

        <section id="public" className="on-ds__section">
          <h2 className="on-h2">Site public — chrome</h2>
          <div className="on-preview">
            <PublicHeader zone={zone} onZone={setZone} onCart={() => setCartOpen(true)} />
            <HeroPlaceholder />
            <EditorialSection />
            <PublicFooter />
          </div>
        </section>

        <section id="dashboard" className="on-ds__section">
          <h2 className="on-h2">Dashboard propriétaire</h2>
          <div className="on-preview">
            <DashboardShell
              zone={dashZone}
              onZone={setDashZone}
              search={search}
              onSearch={setSearch}
            />
          </div>
        </section>

        <section id="pos" className="on-ds__section">
          <h2 className="on-h2">POS vendeuse</h2>
          <div className="on-preview">
            <PosShell />
          </div>
        </section>
      </div>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={lines}
        onQuantity={(id, quantity) =>
          setLines((current) => current.map((line) => (line.id === id ? { ...line, quantity } : line)))
        }
      />
      <Modal
        title="Confirmer la clôture ?"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => setModalOpen(false)}
        confirmLabel="Clôturer"
      >
        Cette action est définitive pour la journée en cours.
      </Modal>
      <Toast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
}
