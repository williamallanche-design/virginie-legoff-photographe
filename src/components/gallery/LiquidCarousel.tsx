"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { animate, motion, useMotionValue, useSpring, useTransform, useVelocity } from "motion/react";
import { Photo } from "@/components/site/Photo";
import { titleOf, type Photo as PhotoData } from "@/lib/catalog";

export type CarouselItem = { photo: PhotoData; href: string; caption: string | null };

const TIDE = [0.65, 0, 0.35, 1] as const;

/**
 * Carrousel horizontal : glisser avec inertie, molette horizontale, flèches du clavier.
 * Les cartes s'inclinent et se resserrent selon la vitesse du geste, puis se reposent.
 */
export function LiquidCarousel({ items, label }: { items: CarouselItem[]; label: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const [minX, setMinX] = useState(0);

  const x = useMotionValue(0);
  const velocity = useVelocity(x);
  const skewX = useSpring(useTransform(velocity, [-2400, 0, 2400], [7, 0, -7], { clamp: true }), {
    stiffness: 180,
    damping: 26,
  });
  const scale = useSpring(useTransform(velocity, [-2400, 0, 2400], [0.94, 1, 0.94], { clamp: true }), {
    stiffness: 180,
    damping: 26,
  });
  const progress = useTransform(x, [0, Math.min(-1, minX)], [0, 1], { clamp: true });

  useEffect(() => {
    const measure = () => {
      if (!viewport.current || !track.current) return;
      const min = Math.min(0, viewport.current.clientWidth - track.current.scrollWidth);
      setMinX(min);
      if (x.get() < min) x.set(min);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (viewport.current) ro.observe(viewport.current);
    if (track.current) ro.observe(track.current);
    return () => ro.disconnect();
  }, [x, items.length]);

  const clampX = (v: number) => Math.max(minX, Math.min(0, v));
  const glide = (to: number) => animate(x, clampX(to), { duration: 1.1, ease: TIDE });
  const page = () => (viewport.current?.clientWidth ?? 800) * 0.8;

  // Molette / pavé tactile horizontal uniquement : le scroll vertical de la page reste libre.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      x.set(Math.max(minX, Math.min(0, x.get() - e.deltaX)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [minX, x]);

  // Le focus clavier amène la carte dans le cadre.
  const onFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-card]");
    if (!card || !viewport.current) return;
    const left = card.offsetLeft + x.get();
    const right = left + card.offsetWidth;
    const w = viewport.current.clientWidth;
    if (left < 0 || right > w) glide(-card.offsetLeft + (w - card.offsetWidth) / 2);
  };

  const blockClickAfterDrag = (e: ReactMouseEvent) => {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="grid gap-8">
      <div
        ref={viewport}
        role="region"
        aria-roledescription="carrousel"
        aria-label={label}
        className="overflow-hidden"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") glide(x.get() - page());
          if (e.key === "ArrowLeft") glide(x.get() + page());
        }}
      >
        <motion.div
          ref={track}
          drag="x"
          dragConstraints={{ left: minX, right: 0 }}
          dragElastic={0.08}
          dragTransition={{ power: 0.32, timeConstant: 380, bounceStiffness: 260, bounceDamping: 32 }}
          onDragStart={() => (moved.current = true)}
          onDragEnd={() => window.setTimeout(() => (moved.current = false), 60)}
          onClickCapture={blockClickAfterDrag}
          onFocus={onFocus}
          style={{ x }}
          data-cursor="Glisser"
          className="flex w-max cursor-grab gap-[clamp(16px,2.4vw,40px)] active:cursor-grabbing"
        >
          {items.map(({ photo, href, caption }) => (
            <motion.div key={photo.slug} data-card style={{ skewX, scale }} className="w-[clamp(240px,27vw,440px)] shrink-0">
              <Link href={href} draggable={false} className="group block" data-cursor="Voir">
                <div className="relative aspect-[4/5] overflow-hidden" style={{ backgroundColor: photo.color }}>
                  <Photo
                    photo={photo}
                    fill
                    sizes="(min-width: 768px) 28vw, 70vw"
                    className="pointer-events-none object-cover transition-transform duration-[1.2s] ease-reveal group-hover:scale-[1.04]"
                  />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <span className="font-display text-[1.15rem] leading-snug italic">{titleOf(photo)}</span>
                  {caption && <span className="meta shrink-0">{caption}</span>}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="flex items-center gap-6">
        <span aria-hidden className="relative h-px flex-1 bg-line">
          <motion.span style={{ scaleX: progress }} className="absolute inset-0 origin-left bg-fg" />
        </span>
        <div className="flex gap-5">
          <button type="button" onClick={() => glide(x.get() + page())} className="meta link-line text-fg">
            Précédent
          </button>
          <button type="button" onClick={() => glide(x.get() - page())} className="meta link-line text-fg">
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}
