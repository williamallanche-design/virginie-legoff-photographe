import type { ComponentProps } from "react";

type Mood = "papier" | "nuit";

/**
 * Une section déclare son humeur ; le fond est peint par <body> (voir <Tide />),
 * la section ne fixe que la couleur du texte via les tokens sémantiques.
 */
export function Section({ mood, className = "", ...props }: ComponentProps<"section"> & { mood: Mood }) {
  return <section data-mood={mood} className={`relative text-fg ${className}`} {...props} />;
}
