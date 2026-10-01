"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { Photo } from "@/components/site/Photo";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useMediaQuery } from "@/lib/media-query";
import { scrollToY } from "@/lib/scroll";
import { mediaSrc, titleOf, type Photo as PhotoData } from "@/lib/catalog";
import { LiquidGL } from "./liquid-gl";

export type CarouselItem = { photo: PhotoData; href: string; caption: string | null };

/**
 * Liquid Carousel : la section s'épingle et le scroll vertical fait défiler les tirages
 * à l'horizontale. Les images sont rendues en WebGL (courbure et houle selon la vitesse,
 * ronds dans l'eau au survol). Sans WebGL, les images du DOM restent affichées telles quelles.
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
      const cards = gsap.utils.toArray<HTMLElement>("[data-card]", track.current);
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
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
            const centre = self.progress * distance() + viewport.current!.clientWidth / 2;
            const i = cards.findIndex((c) => c.offsetLeft + c.offsetWidth > centre);
            setIndex(i < 0 || self.progress > 0.985 ? n - 1 : i);
          },
        },
      });
      trigger.current = tween.scrollTrigger ?? null;

      // Rendu WebGL seulement quand la section est à l'écran (test direct : la section épinglée
      // passe en position fixe, ce qu'IntersectionObserver ne suit pas de façon fiable).
      // Vitesse mesurée sur le déplacement réel de la piste : nulle dès que la piste s'arrête.
      let lastX = 0;
      let lastT = performance.now();
      const tick = () => {
        const x = Number(gsap.getProperty(track.current, "x")) || 0;
        const now = performance.now();
        const speed = ((x - lastX) / Math.max(8, now - lastT)) * 1000; // px/s
        lastX = x;
        lastT = now;
        gl?.setVelocity(-speed / 2200);
        const r = root.current?.getBoundingClientRect();
        if (r && r.bottom > 0 && r.top < window.innerHeight) gl?.render();
      };
      gsap.ticker.add(tick);
      const onMove = (e: PointerEvent) => gl?.setPointer(e.clientX, e.clientY);
      window.addEventListener("pointermove", onMove, { passive: true });

      return () => {
        gsap.ticker.remove(tick);
        window.removeEventListener("pointermove", onMove);
        gl?.destroy();
        trigger.current = null;
      };
    },
    { scope: root, dependencies: [reduced, n] },
  );

  /** Amène la carte i au centre en déplaçant le scroll de la page (la section est épinglée). */
  const goTo = (i: number) => {
    const st = trigger.current;
    const card = track.current?.querySelectorAll<HTMLElement>("[data-card]")[i];
    if (!st || !card || !viewport.current) return;
    const max = track.current!.scrollWidth - viewport.current.clientWidth;
    const target = Math.max(0, Math.min(max, card.offsetLeft - (viewport.current.clientWidth - card.offsetWidth) / 2));
    scrollToY(st.start + (max ? target / max : 0) * (st.end - st.start));
  };

  return (
    <div
      ref={root}
      className={`relative grid ${reduced ? "" : "h-dvh"} grid-rows-[auto_minmax(0,1fr)_auto] gap-[clamp(1.5rem,4vh,3rem)] pt-[clamp(5rem,9vw,7rem)] pb-[max(env(safe-area-inset-bottom),1.75rem)]`}
    >
      {header && <div className="gutter">{header}</div>}

      <div
        ref={viewport}
        role="region"
        aria-roledescription="carrousel"
        aria-label={label}
        className={`relative min-h-0 ${reduced ? "h-[62vh] overflow-x-auto" : "overflow-hidden"}`}
      >
        <div ref={track} className="gutter flex h-full w-max items-center gap-[clamp(16px,2.6vw,44px)]">
          {items.map(({ photo, href, caption }, i) => (
            <Link
              key={photo.slug}
              href={href}
              data-card
              data-cursor="Voir"
              draggable={false}
              onFocus={() => goTo(i)}
              className="group grid shrink-0 gap-4"
            >
              <div
                data-media
                data-src={`${mediaSrc(photo)}/960.webp`}
                className="relative aspect-[4/5] h-[min(52vh,560px)] max-w-[78vw] overflow-hidden data-[gl=ready]:[&_img]:opacity-0"
                style={{ backgroundColor: photo.color }}
              >
                <Photo photo={photo} fill sizes="(min-width: 768px) 30vw, 75vw" className="object-cover transition-opacity duration-500" />
              </div>
              <div className="flex items-baseline justify-between gap-4 [contain:inline-size]">
                <span className="font-display text-[1.15rem] leading-snug italic">{titleOf(photo)}</span>
                {caption && <span className="meta shrink-0">{caption}</span>}
              </div>
            </Link>
          ))}
        </div>
        {/* Couche WebGL : alignée sur la zone du carrousel, transparente aux clics. */}
        <div ref={layer} aria-hidden className="pointer-events-none absolute inset-0" />
      </div>

      {!reduced && (
        <div className="gutter flex items-center gap-6">
          <span className="meta tabular-nums text-fg">
            {String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </span>
          <span aria-hidden className="relative h-px flex-1 bg-line">
            <span ref={bar} className="absolute inset-0 origin-left scale-x-0 bg-fg" />
          </span>
          <div className="flex gap-5">
            <button type="button" onClick={() => goTo(Math.max(0, index - 1))} className="meta link-line text-fg">
              Précédent
            </button>
            <button type="button" onClick={() => goTo(Math.min(n - 1, index + 1))} className="meta link-line text-fg">
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
