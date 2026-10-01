import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { RevealFade } from "@/components/motion/Reveal";
import { Photo } from "@/components/site/Photo";
import { Section } from "@/components/site/Section";
import { ZoomButton } from "@/components/lightbox/ZoomButton";
import { PrintSelector } from "@/components/shop/PrintSelector";
import {
  exifLine,
  formatDate,
  getPhoto,
  getSeries,
  mediaSrc,
  photos,
  photosOf,
  printableFormats,
  prints,
  titleOf,
} from "@/lib/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return photos.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/oeuvres/[slug]">): Promise<Metadata> {
  const p = getPhoto((await params).slug);
  if (!p) return {};
  const series = getSeries(p.series);
  return {
    title: titleOf(p),
    description: `${titleOf(p)}${p.place ? `, ${p.place}` : ""}. Photographie de Virginie Legoff, série ${series?.title}. Tirages d'art sur papier coton ou aluminium.`,
    openGraph: { images: [{ url: `${mediaSrc(p)}/1600.webp`, width: 1600, height: Math.round((1600 * p.height) / p.width) }] },
  };
}

export default async function ArtworkPage({ params }: PageProps<"/oeuvres/[slug]">) {
  const { slug } = await params;
  const photo = getPhoto(slug);
  if (!photo) notFound();

  const series = getSeries(photo.series)!;
  const siblings = photosOf(photo.series);
  const i = siblings.findIndex((p) => p.slug === photo.slug);
  const prev = siblings[(i - 1 + siblings.length) % siblings.length];
  const next = siblings[(i + 1) % siblings.length];
  const formats = printableFormats(photo);
  const exif = exifLine(photo);
  const portrait = photo.height > photo.width;

  return (
    <>
      <Section mood="papier" className="gutter pt-[clamp(7rem,14vw,10rem)] pb-[clamp(5rem,10vw,8rem)]">
        <div className="grid gap-y-12 md:grid-cols-12 md:gap-x-10">
          <div className={`md:sticky md:top-28 md:self-start ${portrait ? "md:col-span-6 md:col-start-2" : "md:col-span-8"}`}>
            <ViewTransition name={`photo-${photo.slug}`} share="morph" default="none">
              <div className="relative" style={{ aspectRatio: `${photo.width} / ${photo.height}`, backgroundColor: photo.color }}>
                <Photo photo={photo} fill priority sizes="(min-width: 768px) 66vw, 100vw" className="object-contain" />
              </div>
            </ViewTransition>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
              <span className="meta">{photo.title ? series.title : `Réf. ${photo.ref}`}</span>
              <ZoomButton photo={photo} context={series.title} />
            </div>
          </div>

          <aside className={`grid content-start gap-10 ${portrait ? "md:col-span-4 md:col-start-9" : "md:col-span-4"}`}>
            <RevealFade className="grid gap-4">
              <Link href={`/galeries/${series.slug}/`} className="meta link-line w-fit">
                Série · {series.title}
              </Link>
              <h1 className="text-h2 italic">{titleOf(photo)}</h1>
              <dl className="grid gap-1 text-[0.95rem]">
                {photo.place && (
                  <div className="flex gap-3">
                    <dt className="sr-only">Lieu</dt>
                    <dd>{photo.place}</dd>
                  </div>
                )}
                {photo.date && (
                  <div className="flex gap-3">
                    <dt className="sr-only">Date</dt>
                    <dd className="text-muted">{formatDate(photo.date)}</dd>
                  </div>
                )}
                {exif && (
                  <div className="mt-2 flex gap-3">
                    <dt className="sr-only">Prise de vue</dt>
                    <dd className="meta">{exif}</dd>
                  </div>
                )}
              </dl>
              {photo.description && <p className="text-muted">{photo.description}</p>}
            </RevealFade>

            <div className="border-t border-fg pt-8">
              {formats.length ? (
                <PrintSelector photo={photo} formats={formats} />
              ) : (
                <div className="grid gap-4">
                  <p className="meta">Tirage</p>
                  <p className="text-muted">
                    Cette photographie n&apos;est pas proposée en tirage dans les formats standards. Écrivez à Virginie
                    pour envisager un format adapté.
                  </p>
                  <Link href="/contact/" className="link-text w-fit">Prendre contact</Link>
                </div>
              )}
            </div>

            {formats.length > 0 && <p className="text-[0.85rem] text-muted">{prints.note}</p>}
          </aside>
        </div>
      </Section>

      <Section mood="papier" className="gutter pb-[clamp(5rem,10vw,8rem)]">
        <nav aria-label="Dans la même série" className="grid grid-cols-2 gap-8 border-t border-line pt-8">
          {[
            { p: prev, label: "Précédente" },
            { p: next, label: "Suivante" },
          ].map(({ p, label }, k) => (
            <Link key={label} href={`/oeuvres/${p.slug}/`} className={`group grid gap-4 ${k ? "justify-items-end text-right" : ""}`}>
              <span className="meta">{label}</span>
              <span className="relative block aspect-[4/3] w-[clamp(120px,22vw,320px)] overflow-hidden" style={{ backgroundColor: p.color }}>
                <Photo photo={p} fill sizes="22vw" className="object-cover transition-transform duration-700 ease-reveal group-hover:scale-[1.04]" />
              </span>
              <span className="font-display text-[1.2rem] italic">{titleOf(p)}</span>
            </Link>
          ))}
        </nav>
      </Section>
    </>
  );
}
