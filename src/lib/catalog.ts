import catalogJson from "@content/catalog.json";
import printsJson from "@content/prints.json";
import siteJson from "@content/site.json";

export type Exif = {
  camera: string | null;
  lens: string | null;
  focal: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: number | null;
};

export type Photo = {
  slug: string;
  source: string;
  ref: string;
  title: string | null;
  series: string;
  place: string | null;
  date: string | null;
  featured: boolean;
  published: boolean;
  forSale: boolean;
  description: string;
  order: number;
  width: number;
  height: number;
  color: string;
  exif: Exif | null;
};

export type Series = { slug: string; title: string; intro: string; order: number };
export type PrintFormat = { id: string; label: string; widthCm: number; heightCm: number };
export type PrintSupport = { id: string; name: string; finish: string; pricesCents: Record<string, number> };

export const site = siteJson;

/** Adresse publique : variable d'environnement en développement, domaine du site sinon. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || siteJson.url).replace(/\/$/, "");
export const prints = printsJson as unknown as {
  currency: string;
  minDpi: number;
  note: string;
  formats: PrintFormat[];
  supports: PrintSupport[];
};

const catalog = catalogJson as unknown as { series: Series[]; photos: Photo[] };

export const allSeries: Series[] = [...catalog.series].sort((a, b) => a.order - b.order);
export const photos: Photo[] = catalog.photos
  .filter((p) => p.published)
  .sort(
    (a, b) =>
      allSeries.findIndex((s) => s.slug === a.series) - allSeries.findIndex((s) => s.slug === b.series) ||
      a.order - b.order,
  );

export const getSeries = (slug: string) => allSeries.find((s) => s.slug === slug);
export const photosOf = (series: string) => photos.filter((p) => p.series === series);
export const getPhoto = (slug: string) => photos.find((p) => p.slug === slug);
export const featuredPhotos = photos.filter((p) => p.featured);

export const titleOf = (p: Pick<Photo, "title">) => p.title ?? "Sans titre";
export const mediaSrc = (p: Pick<Photo, "slug">) => `/media/${p.slug}`;
export const lightboxSrc = (p: Pick<Photo, "slug">) => `/media/${p.slug}/lightbox.webp`;

const YEAR = /^(\d{4})/;
export const yearOf = (p: Pick<Photo, "date">) => p.date?.match(YEAR)?.[1] ?? null;

export function formatDate(date: string | null) {
  if (!date) return null;
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function exifLine(p: Photo) {
  const e = p.exif;
  if (!e) return null;
  // Le modèle de l'appareil reste dans les données mais n'est pas affiché.
  const parts = [e.focal, e.aperture, e.shutter, e.iso ? `ISO ${e.iso}` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export const euros = (cents: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: prints.currency.toUpperCase(),
    minimumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);

const CM_PER_INCH = 2.54;

/** Résolution d'impression obtenue sans recadrage (image inscrite dans le papier). */
export function printDpi(p: Pick<Photo, "width" | "height">, f: PrintFormat) {
  const longPx = Math.max(p.width, p.height);
  const shortPx = Math.min(p.width, p.height);
  const longIn = Math.max(f.widthCm, f.heightCm) / CM_PER_INCH;
  const shortIn = Math.min(f.widthCm, f.heightCm) / CM_PER_INCH;
  // L'image remplit le papier sur sa dimension contraignante : c'est elle qui fixe la résolution.
  return Math.round(Math.max(longPx / longIn, shortPx / shortIn));
}

/** Taille réelle de l'image imprimée sur le papier, marges blanches comprises. */
export function printedSize(p: Pick<Photo, "width" | "height">, f: PrintFormat) {
  const landscape = p.width >= p.height;
  const paperW = landscape ? Math.max(f.widthCm, f.heightCm) : Math.min(f.widthCm, f.heightCm);
  const paperH = landscape ? Math.min(f.widthCm, f.heightCm) : Math.max(f.widthCm, f.heightCm);
  const scale = Math.min(paperW / p.width, paperH / p.height);
  const w = Math.round(p.width * scale * 10) / 10;
  const h = Math.round(p.height * scale * 10) / 10;
  return { paperW, paperH, w, h, margins: Math.abs(w - paperW) > 0.3 || Math.abs(h - paperH) > 0.3 };
}

export const printableFormats = (p: Photo) =>
  p.forSale ? prints.formats.filter((f) => printDpi(p, f) >= prints.minDpi) : [];

export function lowestPrice(p: Photo) {
  const formats = printableFormats(p);
  if (!formats.length) return null;
  return Math.min(...prints.supports.flatMap((s) => formats.map((f) => s.pricesCents[f.id])));
}

export const forSalePhotos = photos.filter((p) => printableFormats(p).length > 0);
