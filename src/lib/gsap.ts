"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
  gsap.defaults({ ease: "expo.out", duration: 1 });
}

/** Les deux courbes de la charte, utilisables dans GSAP. */
export const EASE_REVEAL = "expo.out"; // ≈ cubic-bezier(.16, 1, .3, 1)
export const EASE_TIDE = "power3.inOut"; // ≈ cubic-bezier(.65, 0, .35, 1)

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger, SplitText, useGSAP };
