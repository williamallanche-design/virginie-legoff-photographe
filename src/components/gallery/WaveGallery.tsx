"use client";

import Link from "next/link";
import { useMemo, useRef, ViewTransition } from "react";
import { Photo } from "@/components/site/Photo";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { titleOf, yearOf, type Photo as PhotoData } from "@/lib/catalog";

type Props = {
  photos: PhotoData[];
  /** Ouvre la lightbox au lieu de naviguer vers la fiche œuvre. */
  onOpen?: (index: number) => void;
  /** Morphing de la vignette vers la fiche œuvre (View Transitions). Un seul usage par page. */
  morph?: boolean;
  labelOf?: (p: PhotoData) => string | null;
};

// Décalages de la cascade : départ des colonnes, retrait horizontal des images, vitesse de parallaxe.
const COLUMN_OFFSET = ["md:pt-0", "md:pt-[22vh]", "md:pt-[9vh]"];
const COLUMN_SPEED = [-4, -16, -9];
const WAVE = ["0%", "12%", "4%", "16%", "7%", "0%", "10%"];

/** Répartit les photos en 3 colonnes en équilibrant leur hauteur cumulée (maçonnerie). */
function toColumns(photos: PhotoData[]) {
  const cols: { photo: PhotoData; index: number }[][] = [[], [], []];
  const heights = [0, 0, 0];
  photos.forEach((photo, index) => {
    const c = heights.indexOf(Math.min(...heights));
    cols[c].push({ photo, index });
    heights[c] += photo.height / photo.width + 0.18;
  });
  return cols;
}

export function WaveGallery({ photos, onOpen, morph = false, labelOf }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const columns = useMemo(() => toColumns(photos), [photos]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const cols = gsap.utils.toArray<HTMLElement>("[data-wave-col]");
        cols.forEach((col, i) =>
          gsap.to(col, {
            yPercent: COLUMN_SPEED[i],
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
          }),
        );

        // Chaque image glisse légèrement dans son cadre : profondeur sans recadrage visible.
        gsap.utils.toArray<HTMLElement>("[data-wave-inner]").forEach((inner) =>
          gsap.fromTo(
            inner,
            { yPercent: -5 },
            {
              yPercent: 5,
              ease: "none",
              scrollTrigger: { trigger: inner.parentElement, start: "top bottom", end: "bottom top", scrub: true },
            },
          ),
        );

        // Déformation : inclinaison proportionnelle à la vitesse du scroll, plafonnée à 4°.
        const items = gsap.utils.toArray<HTMLElement>("[data-wave-item]");
        const skewTo = gsap.quickTo(items, "skewY", { duration: 0.9, ease: "power3.out" });
        const clamp = gsap.utils.clamp(-4, 4);
        let rest: number | undefined;
        ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            skewTo(clamp(self.getVelocity() / -320));
            window.clearTimeout(rest);
            rest = window.setTimeout(() => skewTo(0), 140);
          },
        });
        return () => window.clearTimeout(rest);
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [photos] },
  );

  return (
    <div
      ref={root}
      className="columns-2 gap-4 md:grid md:grid-cols-[1.15fr_0.85fr_1fr] md:items-start md:gap-[clamp(20px,3.2vw,56px)] md:pb-[12vh]"
    >
      {columns.map((col, c) => (
        <div
          key={c}
          data-wave-col
          className={`contents md:flex md:flex-col md:gap-[clamp(48px,9vw,160px)] md:will-change-transform ${COLUMN_OFFSET[c]}`}
        >
          {col.map(({ photo, index }, k) => {
            const label = labelOf ? labelOf(photo) : [photo.place, yearOf(photo)].filter(Boolean).join(" · ");
            const image = (
              <div
                className="relative overflow-hidden"
                style={{ aspectRatio: `${photo.width} / ${photo.height}`, backgroundColor: photo.color }}
              >
                <div data-wave-inner className="absolute inset-[-6%_0] will-change-transform">
                  <Photo
                    photo={photo}
                    fill
                    sizes="(min-width: 768px) 34vw, 50vw"
                    className="object-cover transition-[filter] duration-300 group-hover:brightness-[1.05]"
                  />
                </div>
              </div>
            );
            const media = morph ? (
              <ViewTransition name={`photo-${photo.slug}`} share="morph" default="none">
                {image}
              </ViewTransition>
            ) : (
              image
            );

            return (
              <figure
                key={photo.slug}
                data-wave-item
                className="group mb-6 break-inside-avoid md:mb-0"
                style={{ ["--wave" as string]: WAVE[(k + c * 2) % WAVE.length] }}
              >
                <div className="md:ml-(--wave)">
                  {onOpen ? (
                    <button
                      type="button"
                      onClick={() => onOpen(index)}
                      data-cursor="Voir"
                      aria-label={`Agrandir « ${titleOf(photo)} »`}
                      className="block w-full text-left"
                    >
                      {media}
                    </button>
                  ) : (
                    <Link href={`/oeuvres/${photo.slug}/`} data-cursor="Voir" className="block">
                      {media}
                    </Link>
                  )}
                  <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="font-display text-[1.05rem] leading-snug italic">{titleOf(photo)}</span>
                    {label && <span className="meta">{label}</span>}
                  </figcaption>
                </div>
              </figure>
            );
          })}
        </div>
      ))}
    </div>
  );
}
