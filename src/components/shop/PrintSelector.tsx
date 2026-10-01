"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { addToCart } from "@/lib/cart";
import { euros, printedSize, prints, type Photo, type PrintFormat } from "@/lib/catalog";

/** Choix du format et du support d'un tirage, prix mis à jour, ajout au panier. */
export function PrintSelector({ photo, formats }: { photo: Photo; formats: PrintFormat[] }) {
  const id = useId();
  const [format, setFormat] = useState(formats[0].id);
  const [support, setSupport] = useState(prints.supports[0].id);
  const [added, setAdded] = useState(false);

  const f = formats.find((x) => x.id === format)!;
  const s = prints.supports.find((x) => x.id === support)!;
  const size = printedSize(photo, f);
  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

  return (
    <div className="grid gap-7">
      <fieldset className="grid gap-3">
        <legend className="meta mb-3">Format du papier</legend>
        <div className="flex w-fit max-w-full border border-line">
          {formats.map((x) => (
            <label key={x.id} className="cursor-pointer">
              <input
                type="radio"
                name={`${id}-format`}
                value={x.id}
                checked={format === x.id}
                onChange={() => (setFormat(x.id), setAdded(false))}
                className="peer sr-only"
              />
              <span className="block px-5 py-3 font-mono text-[0.8rem] tracking-[0.08em] text-muted transition-colors duration-300 peer-checked:bg-fg peer-checked:text-bg peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-accent">
                {x.label}
              </span>
            </label>
          ))}
        </div>
        <p className="text-[0.9rem] text-muted">
          {size.margins
            ? `Image imprimée : ${fmt(size.w)} × ${fmt(size.h)} cm, centrée avec des marges blanches. La photographie n'est pas recadrée.`
            : `Image imprimée à fond perdu : ${fmt(size.w)} × ${fmt(size.h)} cm.`}
        </p>
      </fieldset>

      <fieldset>
        <legend className="meta mb-3">Support</legend>
        <div className="border-t border-line">
          {prints.supports.map((x) => (
            <label
              key={x.id}
              className="grid cursor-pointer grid-cols-[18px_minmax(0,1fr)_auto] items-baseline gap-4 border-b border-line py-4"
            >
              <input
                type="radio"
                name={`${id}-support`}
                value={x.id}
                checked={support === x.id}
                onChange={() => (setSupport(x.id), setAdded(false))}
                className="translate-y-0.5 accent-lueur"
              />
              <span className="grid min-w-0 gap-0.5">
                <span>{x.name}</span>
                <span className="text-[0.82rem] text-muted">{x.finish}</span>
              </span>
              <span className="font-display text-[1.35rem] tabular-nums">{euros(x.pricesCents[format])}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="grid gap-1">
          <span className="meta">Total · livraison calculée au paiement</span>
          <span className="font-display text-[2.6rem] leading-none tabular-nums">{euros(s.pricesCents[format])}</span>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            addToCart({ photo: photo.slug, support, format });
            setAdded(true);
          }}
        >
          Ajouter au panier
        </button>
      </div>

      <p role="status" aria-live="polite" className="meta min-h-[1.4em] text-fg">
        {added && (
          <>
            Ajouté au panier ·{" "}
            <Link href="/panier/" className="link-text">
              Voir le panier
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
