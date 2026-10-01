"use client";

import { useSyncExternalStore } from "react";

/** Abonnement à une media query ; `false` pendant le rendu statique. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const noop = () => () => {};

/** `true` une fois l'hydratation faite (et sur tous les rendus suivants). */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);
