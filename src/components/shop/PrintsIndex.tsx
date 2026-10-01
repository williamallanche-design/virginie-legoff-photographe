"use client";

import Link from "next/link";
import { useState, ViewTransition } from "react";
import { Photo } from "@/components/site/Photo";
import { euros, lowestPrice, titleOf, type Photo as PhotoData, type Series } from "@/lib/catalog";

// Rythme de la grille : largeurs alternées sur 12 colonnes, jamais deux rangées identiques.
const RHYTHM = [
  "md:col-span-7",
  "md:col-span-4 md:col-start-9 md:mt-[18vh]",
  "md:col-span-4 md:col-start-2",
  "md:col-span-6 md:col-start-7 md:-mt-[10vh]",
  "md:col-span-5",
  "md:col-span-5 md:col-start-8 md:mt-[12vh]",
];

export function PrintsIndex({ photos, series }: { photos: PhotoData[]; series: Series[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const list = filter ? photos.filter((p) => p.series === filter) : photos;

  return (
    <div className="grid gap-[clamp(3rem,6vw,5rem)]">
      <div role="group" aria-label="Filtrer par série" className="flex flex-wrap gap-x-8 gap-y-3">
        {[{ slug: null, title: "Toutes" }, ...series].map((s) => (
          <button
            key={s.slug ?? "all"}
            type="button"
            aria-pressed={filter === s.slug}
            onClick={() => setFilter(s.slug)}
            className="meta link-line text-muted aria-pressed:link-line-on aria-pressed:text-fg"
          >
            {s.title}
            <span className="ml-2 tabular-nums">
              {s.slug ? photos.filter((p) => p.series === s.slug).length : photos.length}
            </span>
          </button>
        ))}
      </div>

      <ul className="grid gap-y-[clamp(3rem,7vw,6rem)] md:grid-cols-12 md:gap-x-8">
        {list.map((p, i) => (
          <li key={p.slug} className={RHYTHM[i % RHYTHM.length]}>
            <Link href={`/oeuvres/${p.slug}/`} className="group block" data-cursor="Voir">
              <ViewTransition name={`photo-${p.slug}`} share="morph" default="none">
                <div
                  className="relative overflow-hidden"
                  style={{ aspectRatio: `${p.width} / ${p.height}`, backgroundColor: p.color }}
                >
                  <Photo
                    photo={p}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] ease-reveal group-hover:scale-[1.03]"
                  />
                </div>
              </ViewTransition>
              <div className="mt-4 flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <span className="font-display text-[1.2rem] italic">{titleOf(p)}</span>
                <span className="meta shrink-0 tabular-nums">dès {euros(lowestPrice(p)!)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
