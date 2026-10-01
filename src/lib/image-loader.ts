// Variantes publiques générées pour chaque photo : /media/<slug>/<largeur>.webp
// La version 2400 px filigranée de la lightbox n'est jamais servie par ce loader.
export const MEDIA_WIDTHS = [480, 960, 1600] as const;

export default function mediaLoader({ src, width }: { src: string; width: number }) {
  if (!src.startsWith("/media/")) return src;
  const variant = MEDIA_WIDTHS.find((w) => w >= width) ?? MEDIA_WIDTHS[MEDIA_WIDTHS.length - 1];
  return `${src}/${variant}.webp`;
}
