import type { ComponentProps } from "react";

type Mood = "papier" | "nuit";

/**
 * Une section déclare son humeur et peint elle-même son fond et son texte :
 * le contraste ne dépend jamais de la position de défilement.
 */
export function Section({ mood, className = "", ...props }: ComponentProps<"section"> & { mood: Mood }) {
  return <section data-mood={mood} className={`relative bg-bg text-fg ${className}`} {...props} />;
}
