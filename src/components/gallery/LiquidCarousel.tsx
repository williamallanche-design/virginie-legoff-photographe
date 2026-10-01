"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Photo } from "@/components/site/Photo";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useMediaQuery } from "@/lib/media-query";
import { scrollToY } from "@/lib/scroll";
import { mediaSrc, titleOf, type Photo as PhotoData } from "@/lib/catalog";
import { LiquidGL } from "./liquid-gl";

export type CarouselItem = { photo: PhotoData; href: string; caption: string | null };

const REVEAL = [0.16, 1, 0.3, 1] as const;

/**
 * Liquid Carousel : la section s'épingle et le scroll vertical fait glisser le ruban de tirages
 * derrière une lentille de verre liquide (WebGL). Chaque tirage passe par le centre de la lentille,
 * où il est net ; sa légende s'affiche dessous. Sans WebGL, le ruban reste visible tel quel.
 */
export function LiquidCarousel({ items, label, header }: { items: CarouselItem[]; label: string; header?: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [index, setIndex] = useState(0);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const n = items.length;

  useGSAP(
    () => {
      if (reduced || !track.current || !viewport.current || !root.current) return;
      const distance = () => Math.max(0, track.current!.scrollWidth - viewport.current!.clientWidth);
      let gl: LiquidGL | null = null;

      try {
        gl = new LiquidGL(layer.current!, gsap.utils.toArray<HTMLElement>("[data-media]", track.current), (el) => {
          // Le plan WebGL a pris le relais : l'image du DOM et son fond s'effacent.
          el.dataset.gl = "ready";
          el.style.backgroundColor = "transparent";
        });
      } catch {
        gl = null; // pas de WebGL : on garde les images du DOM
      }

      const tween = gsap.to(track.current, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => `+=${distance() * 1.1}`,
          pin: true,
          scrub: 0.9,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
            // La piste est centrée : la carte au centre de la lentille se déduit de la progression.
            setIndex(Math.round(self.progress * (n - 1)));
          },
          // Aimantage : à l'arrêt, le tirage le plus proche se pose au centre de la lentille.
          onScrubComplete: (self) => {
            if (!self.isActive || n < 2) return;
            const y = self.start + (Math.round(self.progress * (n - 1)) / (n - 1)) * (self.end - self.start);
            if (Math.abs(y - self.scroll()) > 2) scrollToY(y, 0.7);
          },
        },
      });
      trigger.current = tween.scrollTrigger ?? null;

      // Vitesse mesurée sur le déplacement réel de la piste : nulle dès que la piste s'arrête.
      let lastX = 0;
      let lastT = performance.now();
      const tick = () => {
        const x = Number(gsap.getProperty(track.current, "x")) || 0;
        const now = performance.now();
        const speed = ((x - lastX) / Math.max(8, now - lastT)) * 1000; // px/s
        lastX = x;
        lastT = now;
        gl?.setVelocity(-speed / 1800);
        // Rendu seulement quand la section est à l'écran (la section épinglée passe en position fixe).
        const r = root.current?.getBoundingClientRect();
        if (r && r.bottom > 0 && r.top < window.innerHeight) gl?.render();
      };
      gsap.ticker.add(tick);

      return () => {
        gsap.ticker.remove(tick);
        gl?.destroy();
        trigger.current = null;
      };
    },
    { scope: root, dependencies: [reduced, n] },
  );

  /** Amène la carte i au centre de la lentille en déplaçant le scroll de la page. */
  const goTo = (i: number) => {
    const st = trigger.current;
    if (!st) return;
    const target = n > 1 ? Math.max(0, Math.min(1, i / (n - 1))) : 0;
    scrollToY(st.start + target * (st.end - st.start));
  };

  const current = items[index] ?? items[0];
  // Hauteur des cartes : elle fixe leur largeur (4:5) et le centrage de la piste.
  // Sur mobile, la largeur de l'écran limite la hauteur (carte de 4:5 ≤ 72 % de la largeur).
  const sizes = { "--card-h": "min(54vh, 620px, 90vw)" } as CSSProperties;

  return (
    <div
      ref={root}
      style={sizes}
      className={`relative grid ${reduced ? "" : "h-dvh"} grid-rows-[auto_minmax(0,1fr)_auto] gap-[clamp(1rem,3vh,2.5rem)] pt-[clamp(5rem,9vw,7rem)] pb-[max(env(safe-area-inset-bottom),1.75rem)]`}
    >
      {header && <div className="gutter">{header}</div>}

      <div
        ref={viewport}
        role="region"
        aria-roledescription="carrousel"
        aria-label={label}
        className={`relative min-h-0 ${reduced ? "overflow-x-auto py-6" : "overflow-hidden"}`}
      >
        <div
          ref={track}
          className="flex h-full w-max items-center gap-[clamp(20px,3vw,56px)] px-[calc(50%-var(--card-h)*0.4)]"
        >
          {items.map(({ photo, href, caption }, i) => (
            <Link
              key={photo.slug}
              href={href}
              data-cursor="Voir"
              draggable={false}
              onFocus={() => goTo(i)}
              aria-label={`${titleOf(photo)}${caption ? `, ${caption}` : ""}`}
              className="block shrink-0"
            >
              <div
                data-media
                data-src={`${mediaSrc(photo)}/960.webp`}
                className="relative aspect-[4/5] h-(--card-h) max-w-[80vw] overflow-hidden data-[gl=ready]:[&_img]:opacity-0"
                style={{ backgroundColor: photo.color }}
              >
                <Photo photo={photo} fill sizes="(min-width: 768px) 34vw, 80vw" className="object-cover transition-opacity duration-500" />
              </div>
            </Link>
          ))}
        </div>
        {/* Couche WebGL : alignée sur la zone du ruban, transparente aux clics. */}
        <div ref={layer} aria-hidden className="pointer-events-none absolute inset-0" />
      </div>

      <div className="gutter grid items-end gap-5 md:grid-cols-12 md:gap-x-8">
        <div className="min-h-[4.5rem] md:col-span-5 md:col-start-5 md:text-center" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.photo.slug}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: REVEAL }}
              className="grid gap-1"
            >
              <Link href={current.href} className="font-display text-h3 text-fg italic">
                {titleOf(current.photo)}
              </Link>
              {current.caption && <span className="meta">{current.caption}</span>}
            </motion.div>
          </AnimatePresence>
        </div>
        {!reduced && (
          <div className="flex items-center gap-5 md:col-span-3 md:col-start-10">
            <span className="meta tabular-nums text-fg">
              {String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
            <span aria-hidden className="relative h-px flex-1 bg-line">
              <span ref={bar} className="absolute inset-0 origin-left scale-x-0 bg-fg" />
            </span>
            <button type="button" onClick={() => goTo(Math.max(0, index - 1))} className="meta link-line text-fg" aria-label="Tirage précédent">
              Préc.
            </button>
            <button type="button" onClick={() => goTo(Math.min(n - 1, index + 1))} className="meta link-line text-fg" aria-label="Tirage suivant">
              Suiv.
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
