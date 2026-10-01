"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useHydrated, useMediaQuery } from "@/lib/media-query";

type Manifest = { frames: number; desktop: { width: number; height: number }; mobile: { width: number; height: number } };

const pad = (n: number) => String(n).padStart(4, "0");

/**
 * Ordre de chargement : une image sur 16, puis sur 8, 4, 2, puis toutes.
 * Le scrub fonctionne dès les premières centaines de Ko (à faible cadence),
 * puis s'affine à mesure que la séquence arrive.
 */
function loadingOrder(count: number) {
  const order: number[] = [];
  const seen = new Set<number>();
  for (const step of [16, 8, 4, 2, 1]) {
    for (let i = 0; i < count; i += step) {
      if (seen.has(i)) continue;
      seen.add(i);
      order.push(i);
    }
  }
  if (!seen.has(count - 1)) order.push(count - 1);
  return order;
}

export function HeroScrub({ manifest }: { manifest: Manifest }) {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const hydrated = useHydrated();
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  // Écran portrait : séquence recadrée en 4:5, plus légère.
  const set = useMediaQuery("(max-aspect-ratio: 1/1)") ? "mobile" : "desktop";

  useGSAP(
    () => {
      const cv = canvas.current;
      // Avant l'hydratation, les media queries ne sont pas encore lues : on ne charge rien.
      if (!hydrated || !cv || !section.current) return;
      const ctx = cv.getContext("2d", { alpha: false });
      if (!ctx) return;

      const count = manifest.frames;
      const images: (HTMLImageElement | null)[] = new Array(count).fill(null);
      let target = 0;
      let drawn = -1;
      let alive = true;

      const nearestLoaded = (i: number) => {
        for (let d = 0; d < count; d++) {
          if (images[i - d]) return i - d;
          if (images[i + d]) return i + d;
        }
        return -1;
      };

      const draw = () => {
        const i = nearestLoaded(target);
        if (i < 0 || i === drawn) return;
        const img = images[i]!;
        const { width: cw, height: ch } = cv;
        const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
        drawn = i;
      };

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(cv.clientWidth * dpr);
        cv.height = Math.round(cv.clientHeight * dpr);
        drawn = -1;
        draw();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(cv);

      // Chargement progressif, 6 requêtes en parallèle.
      const queue = loadingOrder(count);
      const loadNext = () => {
        const i = queue.shift();
        if (i === undefined || !alive) return;
        const img = new Image();
        img.decoding = "async";
        img.src = `/hero/${set}/${pad(i)}.webp`;
        img
          .decode()
          .then(() => {
            if (!alive) return;
            images[i] = img;
            draw();
          })
          .catch(() => {})
          .finally(loadNext);
      };
      for (let k = 0; k < 6; k++) loadNext();

      if (reduced) {
        // Pas de scrub : on montre la dernière image, l'instant.
        target = count - 1;
        return () => {
          alive = false;
          ro.disconnect();
        };
      }

      const st = ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          target = Math.min(count - 1, Math.round(self.progress * (count - 1)));
          draw();
          if (counter.current) counter.current.textContent = `${String(target + 1).padStart(3, "0")} / ${count}`;
          if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
        },
      });

      // Textes : chaque phrase occupe une plage du scroll.
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section.current, start: "top top", end: "bottom bottom", scrub: true },
        defaults: { ease: "none" },
      });
      tl.to("[data-hero='title']", { autoAlpha: 0, y: -40, duration: 0.18 }, 0.06)
        .to("[data-hero='hint']", { autoAlpha: 0, duration: 0.06 }, 0.02)
        .fromTo("[data-hero='ecrin']", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.12 }, 0.26)
        .to("[data-hero='ecrin']", { autoAlpha: 0, y: -40, duration: 0.12 }, 0.5)
        .fromTo("[data-hero='instant']", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.14 }, 0.74)
        .to({}, { duration: 0.12 });

      return () => {
        alive = false;
        ro.disconnect();
        st.kill();
      };
    },
    { scope: section, dependencies: [hydrated, set, reduced, manifest.frames], revertOnUpdate: true },
  );

  const poster = hydrated ? `/hero/${set}/${pad(0)}.webp` : undefined;

  return (
    <section
      ref={section}
      data-mood="nuit"
      aria-label="Introduction"
      className={`relative text-ecume ${reduced ? "h-dvh" : "h-[420vh]"}`}
    >
      <div className="sticky top-0 h-dvh overflow-hidden">
        <canvas
          ref={canvas}
          aria-hidden
          className="absolute inset-0 size-full bg-nuit bg-cover bg-center"
          style={poster ? { backgroundImage: `url(${poster})` } : undefined}
        />
        {/* Voiles haut et bas : lisibilité de l'en-tête et du texte sur l'écume et le sable clairs. */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-nuit/55 to-transparent" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-nuit/80 via-nuit/30 to-transparent" />

        <div className="gutter absolute inset-x-0 bottom-0 grid pb-[max(env(safe-area-inset-bottom),2rem)]">
          <div data-hero="title" className="col-start-1 row-start-1 grid gap-6 self-end">
            <p className="font-mono text-meta tracking-[0.12em] text-ecume/80 uppercase">
              Photographe d&apos;art &amp; d&apos;événements · Bretagne
            </p>
            <h1 className="text-display">
              Entre ciel
              <br />
              <em className="text-lueur">et mer</em>
            </h1>
          </div>

          <p
            data-hero="ecrin"
            className="invisible col-start-1 row-start-1 max-w-[18ch] self-end font-display text-h2 italic opacity-0"
          >
            La lumière d&apos;un lieu, qui ne revient jamais tout à fait pareille…
          </p>

          <div
            data-hero="instant"
            className={`grid gap-8 self-end ${reduced ? "col-start-1 row-start-2 mt-10" : "invisible col-start-1 row-start-1 opacity-0"}`}
          >
            <p className="max-w-[20ch] font-display text-h2 italic">…et l&apos;instant qui s&apos;y dépose.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/galeries/" className="btn">
                Voir les séries
              </Link>
              <Link href="/mariages-evenements/" className="btn btn-ghost">
                Mariages &amp; événements
              </Link>
            </div>
          </div>

          <div className="col-start-1 row-start-3 mt-8 flex items-center gap-6 font-mono text-meta tracking-[0.12em] text-ecume/70 uppercase">
            <span data-hero="hint">Faire défiler</span>
            <span aria-hidden className="relative h-px flex-1 bg-ecume/20">
              <span ref={bar} className="absolute inset-0 origin-left scale-x-0 bg-lueur" />
            </span>
            <span ref={counter} aria-hidden className="tabular-nums">
              001 / {manifest.frames}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
