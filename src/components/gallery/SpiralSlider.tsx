"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Photo } from "@/components/site/Photo";
import { gsap, useGSAP } from "@/lib/gsap";
import { useMediaQuery } from "@/lib/media-query";
import { formatDate, titleOf, type Photo as PhotoData } from "@/lib/catalog";

const REVEAL = [0.16, 1, 0.3, 1] as const;

/**
 * Spiral Slider : les photos s'enroulent sur une hélice en perspective.
 * Le scroll (section épinglée) fait tourner l'hélice et la fait monter :
 * la photo de face vient au centre, les suivantes s'éloignent derrière l'axe.
 */
export function SpiralSlider({ photos, header }: { photos: PhotoData[]; header?: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const n = photos.length;

  useGSAP(
    () => {
      if (reduced || !stage.current) return;
      const cards = gsap.utils.toArray<HTMLElement>("[data-spiral-card]", stage.current);
      const state = { p: 0 };
      let shown = 0;

      const render = () => {
        const w = stage.current!.clientWidth;
        const h = stage.current!.clientHeight;
        const wide = w >= 768;
        const step = ((wide ? 24 : 30) * Math.PI) / 180; // angle entre deux photos sur l'hélice
        const radius = wide ? Math.min(w * 0.42, 720) : w * 0.6;
        const rise = h * (wide ? 0.085 : 0.07); // pas de l'hélice

        cards.forEach((card, i) => {
          const d = i - state.p; // distance à la photo de face, en nombre de photos
          const a = d * step;
          const facing = Math.cos(Math.max(-Math.PI, Math.min(Math.PI, a))); // 1 de face, -1 de dos
          const x = Math.sin(a) * radius;
          const z = (Math.cos(a) - 1) * radius;
          const y = d * rise;
          // Au-delà de 75° la photo tourne le dos : elle s'efface avant de passer derrière l'axe.
          const fade = Math.min(1, Math.max(0, (1.75 - Math.abs(a)) / 0.45));
          card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${a.toFixed(4)}rad) scale(${(0.86 + 0.26 * Math.max(0, facing) ** 6).toFixed(4)})`;
          card.style.opacity = fade.toFixed(3);
          card.style.visibility = fade > 0 ? "visible" : "hidden";
          card.style.pointerEvents = Math.abs(d) < 0.5 ? "auto" : "none";
          card.style.filter = `brightness(${(0.45 + 0.55 * Math.max(0, facing) ** 2).toFixed(3)})`;
        });

        const index = Math.max(0, Math.min(n - 1, Math.round(state.p)));
        if (index !== shown) {
          shown = index;
          setActive(index);
        }
        if (bar.current) bar.current.style.transform = `scaleX(${n > 1 ? state.p / (n - 1) : 1})`;
      };

      render();
      gsap.to(state, {
        p: n - 1,
        ease: "none",
        onUpdate: render,
        scrollTrigger: {
          trigger: section.current,
          start: "top top",
          end: () => `+=${(n - 1) * window.innerHeight * 0.38}`,
          pin: true,
          scrub: 1.1,
          invalidateOnRefresh: true,
        },
      });
      window.addEventListener("resize", render);
      return () => window.removeEventListener("resize", render);
    },
    { scope: section, dependencies: [reduced, n] },
  );

  const current = photos[active];

  return (
    <section
      ref={section}
      data-mood="nuit"
      className="relative grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden pt-[clamp(5rem,9vw,7rem)] pb-[max(env(safe-area-inset-bottom),1.75rem)] text-fg"
    >
      {header && <div className="gutter">{header}</div>}

      {reduced ? (
        // Sans animation : simple défilement horizontal.
        <div className="gutter flex snap-x gap-6 overflow-x-auto py-8">
          {photos.map((p) => (
            <Link key={p.slug} href={`/oeuvres/${p.slug}/`} className="relative aspect-[4/5] w-[60vw] max-w-[360px] shrink-0 snap-start overflow-hidden">
              <Photo photo={p} fill sizes="360px" className="object-cover" />
            </Link>
          ))}
        </div>
      ) : (
        <div ref={stage} className="relative min-h-0 [perspective:1600px]" aria-roledescription="carrousel en spirale">
          {/* Axe de l'hélice */}
          <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-line" />
          {/* L'hélice est vue légèrement du dessus : la spirale se lit dans la profondeur. */}
          <div className="absolute inset-0 grid place-items-center [transform-style:preserve-3d] [transform:rotateX(9deg)]">
            {photos.map((p, i) => (
              <Link
                key={p.slug}
                href={`/oeuvres/${p.slug}/`}
                data-spiral-card
                data-cursor="Voir"
                tabIndex={i === active ? 0 : -1}
                aria-hidden={i !== active}
                className="relative col-start-1 row-start-1 block aspect-[4/5] w-[clamp(150px,16vw,290px)] max-md:w-[42vw] overflow-hidden will-change-transform [backface-visibility:hidden]"
                style={{ backgroundColor: p.color, opacity: i === 0 ? 1 : 0 }}
              >
                <Photo photo={p} fill sizes="(min-width: 768px) 26vw, 60vw" className="object-cover" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {!reduced && (
        <div className="gutter grid items-end gap-6 md:grid-cols-12 md:gap-x-8">
          <div className="min-h-[5.5rem] md:col-span-6" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.slug}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: REVEAL }}
                className="grid gap-1"
              >
                <Link href={`/oeuvres/${current.slug}/`} className="font-display text-h3 italic">
                  {titleOf(current)}
                </Link>
                <span className="meta">
                  {[current.place, current.date ? formatDate(current.date) : null].filter(Boolean).join(" · ") || " "}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-5 md:col-span-5 md:col-start-8">
            <span className="meta tabular-nums text-fg">{String(active + 1).padStart(2, "0")}</span>
            <span aria-hidden className="relative h-px flex-1 bg-line">
              <span ref={bar} className="absolute inset-0 origin-left scale-x-0 bg-lueur" />
            </span>
            <span className="meta tabular-nums">{String(n).padStart(2, "0")}</span>
          </div>
        </div>
      )}
    </section>
  );
}
