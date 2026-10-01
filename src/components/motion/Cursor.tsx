"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Curseur de la charte : un point Lueur de 8 px qui devient un disque de 72 px
 * portant le libellé de l'élément survolé (attribut data-cursor="Voir", "Glisser"…).
 * Inactif sur écran tactile.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setEnabled(fine.matches);
    update();
    fine.addEventListener("change", update);
    return () => fine.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled || !dot.current) return;
    const el = dot.current;
    const x = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });

    const move = (e: PointerEvent) => {
      el.style.opacity = "1";
      x(e.clientX);
      y(e.clientY);
      const target = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-cursor]") : null;
      setLabel(target?.dataset.cursor ?? null);
    };
    const leave = () => (el.style.opacity = "0");
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    document.documentElement.classList.add("has-cursor");
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.documentElement.classList.remove("has-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={dot}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[100] opacity-0 transition-opacity duration-300"
    >
      <div
        className={`grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-lueur text-encre transition-[width,height] duration-500 ease-reveal ${
          label ? "size-[72px]" : "size-2"
        }`}
      >
        <span
          className={`font-mono text-[0.62rem] tracking-[0.12em] uppercase transition-opacity duration-300 ${
            label ? "opacity-100 delay-100" : "opacity-0"
          }`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
