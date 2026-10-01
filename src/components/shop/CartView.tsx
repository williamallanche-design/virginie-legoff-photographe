"use client";

import Link from "next/link";
import { useState } from "react";
import { Photo } from "@/components/site/Photo";
import { api, ApiError } from "@/lib/api";
import { setQty, useCart } from "@/lib/cart";
import { euros, photos, printableFormats, prints, titleOf } from "@/lib/catalog";

export function CartView() {
  const items = useCart();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Une ligne n'est valide que si la photo, le support et le format existent toujours au catalogue.
  const lines = items.flatMap((item) => {
    const photo = photos.find((p) => p.slug === item.photo);
    const support = prints.supports.find((s) => s.id === item.support);
    const format = photo && printableFormats(photo).find((f) => f.id === item.format);
    if (!photo || !support || !format) return [];
    return [{ item, photo, support, format, unit: support.pricesCents[format.id] }];
  });
  const total = lines.reduce((sum, l) => sum + l.unit * l.item.qty, 0);

  async function checkout() {
    setPending(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("checkout", {
        json: { items: lines.map(({ item }) => item) },
      });
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Le paiement n'a pas pu démarrer.");
      setPending(false);
    }
  }

  if (!lines.length) {
    return (
      <div className="grid gap-6">
        <p className="text-lead text-muted">Votre panier est vide.</p>
        <Link href="/tirages/" className="btn w-fit">Voir les tirages</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-y-12 md:grid-cols-12 md:gap-x-8">
      <ul className="border-t border-line md:col-span-8">
        {lines.map(({ item, photo, support, format, unit }) => (
          <li
            key={`${item.photo}|${item.support}|${item.format}`}
            className="grid grid-cols-[clamp(72px,12vw,140px)_minmax(0,1fr)] gap-5 border-b border-line py-6"
          >
            <Link href={`/oeuvres/${photo.slug}/`} className="relative block" style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
              <Photo photo={photo} fill sizes="140px" className="object-cover" />
            </Link>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
              <div className="grid content-start gap-1">
                <Link href={`/oeuvres/${photo.slug}/`} className="font-display text-[1.3rem] italic">
                  {titleOf(photo)}
                </Link>
                <span className="text-[0.9rem] text-muted">
                  {support.name} · {format.label}
                </span>
                <span className="meta tabular-nums">{euros(unit)} l&apos;unité</span>
              </div>
              <div className="flex items-center gap-6 sm:flex-col sm:items-end sm:justify-between">
                <div className="flex items-center gap-4" role="group" aria-label={`Quantité pour ${titleOf(photo)}`}>
                  <button type="button" onClick={() => setQty(item, item.qty - 1)} className="meta text-fg" aria-label="Retirer un exemplaire">
                    −
                  </button>
                  <span className="font-mono tabular-nums" aria-live="polite">{item.qty}</span>
                  <button type="button" onClick={() => setQty(item, item.qty + 1)} className="meta text-fg" aria-label="Ajouter un exemplaire" disabled={item.qty >= 10}>
                    +
                  </button>
                </div>
                <span className="font-display text-[1.35rem] tabular-nums">{euros(unit * item.qty)}</span>
                <button type="button" onClick={() => setQty(item, 0)} className="meta link-line">
                  Retirer
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="grid content-start gap-6 md:sticky md:top-32 md:col-span-4 md:self-start">
        <div className="flex items-baseline justify-between gap-4 border-t border-fg pt-6">
          <span className="meta">Sous-total</span>
          <span className="font-display text-[2.4rem] leading-none tabular-nums">{euros(total)}</span>
        </div>
        <p className="text-[0.9rem] text-muted">
          Frais de livraison calculés à l&apos;étape suivante. Paiement sécurisé par Stripe : vos coordonnées bancaires ne
          transitent jamais par ce site.
        </p>
        <button type="button" onClick={checkout} disabled={pending} className="btn w-full">
          {pending ? "Redirection…" : "Passer au paiement"}
        </button>
        <p role="alert" className="text-[0.95rem] text-accent">{error}</p>
        <p className="text-[0.82rem] text-muted">
          En commandant, vous acceptez les{" "}
          <Link href="/cgv/" className="link-text">conditions générales de vente</Link>.
        </p>
      </aside>
    </div>
  );
}
