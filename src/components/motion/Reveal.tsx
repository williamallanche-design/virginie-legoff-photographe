"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { EASE_TIDE, gsap, prefersReducedMotion, SplitText, useGSAP } from "@/lib/gsap";

type Props = { children: ReactNode; className?: string; as?: ElementType; delay?: number };

/** Titres : les lignes montent derrière un masque, décalées de 60 ms. */
export function RevealText({ children, className, as: Tag = "div", delay = 0 }: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const el = ref.current;
      let split: SplitText | undefined;
      document.fonts.ready.then(() => {
        split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "reveal-line" });
        gsap.from(split.lines, {
          yPercent: 108,
          duration: 1.15,
          stagger: 0.06,
          delay,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
      return () => split?.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/** Images : rideau qui se lève (clip-path) pendant que l'image se pose (scale 1.12 → 1). */
export function RevealImage({ children, className, as: Tag = "div", delay = 0 }: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const el = ref.current;
      const inner = el.firstElementChild;
      const tl = gsap.timeline({ delay, scrollTrigger: { trigger: el, start: "top 90%", once: true } });
      tl.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: EASE_TIDE });
      if (inner) tl.fromTo(inner, { scale: 1.12 }, { scale: 1, duration: 1.8 }, 0);
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={`overflow-hidden ${className ?? ""}`}>
      {children}
    </Tag>
  );
}

/** Blocs de texte courant : simple fondu montant. */
export function RevealFade({ children, className, as: Tag = "div", delay = 0 }: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      gsap.from(ref.current, {
        autoAlpha: 0,
        y: 24,
        duration: 1.1,
        delay,
        scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
