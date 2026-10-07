"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CartDrawer } from "@/components/commerce/CartDrawer";
import { ZoneSwitchDialog } from "@/components/commerce/ZoneSwitchDialog";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";
import {
  createOrder,
  fetchCheckoutConfig,
  quoteCart,
  toQuoteItems,
  type CheckoutConfig,
  type FulfillmentOption,
} from "@/lib/checkout";
import { formatMoney, type CurrencyCode } from "@/lib/money";
import { usePublicSession } from "@/lib/usePublicSession";
import "@/styles/home.css";
import "@/styles/checkout.css";

function feeCopy(mode: FulfillmentOption | undefined, currency: CurrencyCode) {
  if (!mode) return { label: "Frais de réception", value: "—" };
  if (mode.mode === "PICKUP") return { label: "Frais de réception", value: "Aucun" };
  if (mode.fee_known && mode.fee_amount > 0) {
    return { label: mode.mode === "SHIPPING" ? "Frais d’expédition" : "Frais de livraison", value: formatMoney(mode.fee_amount, currency) };
  }
  if (mode.fee_payment_status === "NOT_APPLICABLE") {
    return { label: mode.mode === "SHIPPING" ? "Frais d’expédition" : "Frais de livraison", value: "Aucun" };
  }
  return {
    label: mode.mode === "SHIPPING" ? "Frais d’expédition" : "Frais de livraison",
    value: "À confirmer",
  };
}

function payNote(mode: FulfillmentOption | undefined) {
  if (!mode || mode.mode === "PICKUP") {
    return "Les produits sont réglés à l’avance. Le retrait n’ajoute pas de frais de livraison.";
  }
  if (mode.mode === "SHIPPING") {
    return "Les produits sont payés à l’avance. Les frais d’expédition sont réglés à part, lorsqu’ils sont connus.";
  }
  return "Les produits sont payés à l’avance. Les frais de livraison sont réglés à la livraison.";
}

export function CheckoutPage() {
  const router = useRouter();
  const session = usePublicSession();
  const { zone, onZone, hydrated, pendingZone, confirmZone, cancelZone, cartOpen, setCartOpen, lines, onQuantity, remove, clear } =
    session;
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [mode, setMode] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [productsAmount, setProductsAmount] = useState(0);
  const [canSubmitQuote, setCanSubmitQuote] = useState(true);
  const [currency, setCurrency] = useState<CurrencyCode>("XAF");

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    fetchCheckoutConfig(zone)
      .then((result) => {
        if (cancelled) return;
        setConfig(result);
        setCurrency(result.currency_code);
        const first = result.fulfillment_modes.find((item) => item.is_enabled);
        setMode((current) => {
          const still = result.fulfillment_modes.some((item) => item.mode === current && item.is_enabled);
          return still ? current : first?.mode ?? "";
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Les modes de réception n’ont pas pu être chargés.");
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, zone]);

  useEffect(() => {
    if (!hydrated || lines.length === 0) {
      setProductsAmount(0);
      setCanSubmitQuote(false);
      return;
    }
    let cancelled = false;
    quoteCart(zone, toQuoteItems(lines))
      .then((result) => {
        if (cancelled) return;
        setProductsAmount(result.products_amount);
        setCanSubmitQuote(result.can_submit);
        setCurrency(result.currency_code);
        if (!result.can_submit) {
          const issue = result.lines.find((line) => line.issue)?.issue;
          setError(issue ?? "Merci de corriger les quantités du panier.");
        } else {
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Le panier n’a pas pu être vérifié.");
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, zone, lines]);

  const selected = useMemo(
    () => config?.fulfillment_modes.find((item) => item.mode === mode && item.is_enabled),
    [config, mode],
  );
  const fees = feeCopy(selected, currency);
  const enabledModes = config?.fulfillment_modes.filter((item) => item.is_enabled) ?? [];

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (lines.length === 0) {
      setError("Votre panier est vide.");
      return;
    }
    if (!canSubmitQuote) {
      setError("Merci de corriger les quantités avant d’envoyer la commande.");
      return;
    }
    if (!selected) {
      setError("Merci de choisir un mode de réception disponible.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const order = await createOrder({
        zone,
        fulfillment_mode: selected.mode,
        customer_name: name,
        customer_phone: phone,
        city: selected.mode === "SHIPPING" ? city : null,
        neighborhood: selected.mode === "DELIVERY" ? neighborhood : null,
        items: toQuoteItems(lines),
      });
      clear();
      router.push(`/commande/${encodeURIComponent(order.number)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "La commande n’a pas pu être envoyée.");
      setSending(false);
    }
  }

  return (
    <div className="chk">
      <SiteHeader zone={zone} onZone={onZone} onCart={() => setCartOpen(true)} forceSolid />
      <div className="chk-shell">
        <p className="on-label">Commande</p>
        <h1>Vos informations</h1>
        {lines.length === 0 ? (
          <>
            <p className="chk-lead">Votre panier est vide.</p>
            <Link className="on-btn on-btn--primary" href="/boutique">
              Retour à la boutique
            </Link>
          </>
        ) : (
          <div className="chk-layout">
            <form className="chk-form" onSubmit={onSubmit}>
              <p className="chk-hello">Bonjour O’Naturelle</p>
              <label>
                Nom et prénom
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
              </label>
              <label>
                Numéro du commandeur
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  required
                />
              </label>

              <fieldset className="chk-modes">
                <legend className="on-label">Mode de réception</legend>
                {(config?.fulfillment_modes ?? []).map((item) => (
                  <label
                    key={item.mode}
                    className="chk-mode"
                    aria-disabled={!item.is_enabled}
                  >
                    <input
                      type="radio"
                      name="fulfillment"
                      value={item.mode}
                      checked={mode === item.mode}
                      disabled={!item.is_enabled}
                      onChange={() => setMode(item.mode)}
                    />
                    <span>
                      <strong>{item.label}</strong>
                      {!item.is_enabled ? (
                        <p className="chk-unavailable">
                          {item.mode === "SHIPPING"
                            ? "Les expéditions sont momentanément indisponibles."
                            : item.mode === "DELIVERY"
                              ? "Les livraisons sont momentanément indisponibles."
                              : "Le retrait est momentanément indisponible."}
                        </p>
                      ) : null}
                    </span>
                  </label>
                ))}
                {config && enabledModes.length === 0 ? (
                  <p className="chk-error">Aucun mode de réception n’est disponible pour le moment.</p>
                ) : null}
              </fieldset>

              {selected?.mode === "DELIVERY" ? (
                <label>
                  Quartier
                  <input value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} required />
                </label>
              ) : null}
              {selected?.mode === "SHIPPING" ? (
                <label>
                  Ville
                  <input value={city} onChange={(event) => setCity(event.target.value)} required />
                </label>
              ) : null}

              {error ? <p className="chk-error">{error}</p> : null}

              <div className="chk-cta">
                <Link className="on-btn on-btn--secondary" href="/panier">
                  Retour au panier
                </Link>
                <button
                  type="submit"
                  className="on-btn on-btn--primary"
                  disabled={sending || !selected || !canSubmitQuote}
                >
                  {sending ? "Envoi…" : "Envoyer la commande"}
                </button>
              </div>
            </form>

            <aside className="chk-summary">
              <p className="on-label">À régler</p>
              <dl>
                <div>
                  <dt>Produits</dt>
                  <dd>{formatMoney(productsAmount, currency)}</dd>
                </div>
                <div>
                  <dt>{fees.label}</dt>
                  <dd>{fees.value}</dd>
                </div>
                <div>
                  <dt>Total des produits</dt>
                  <dd className="on-price">{formatMoney(productsAmount, currency)}</dd>
                </div>
                <div>
                  <dt>Total à payer maintenant</dt>
                  <dd className="on-price">{formatMoney(productsAmount, currency)}</dd>
                </div>
              </dl>
              <p className="chk-note">{payNote(selected)}</p>
            </aside>
          </div>
        )}
      </div>
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
