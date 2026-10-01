import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SeriesGallery } from "@/components/gallery/SeriesGallery";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/site/Section";
import { allSeries, getSeries, photosOf } from "@/lib/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return allSeries.map((s) => ({ serie: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/galeries/[serie]">): Promise<Metadata> {
  const s = getSeries((await params).serie);
  return s ? { title: s.title, description: s.intro } : {};
}

export default async function SeriesPage({ params }: PageProps<"/galeries/[serie]">) {
  const { serie } = await params;
  const s = getSeries(serie);
  if (!s) notFound();
  const list = photosOf(s.slug);
  const i = allSeries.findIndex((x) => x.slug === s.slug);
  const next = allSeries[(i + 1) % allSeries.length];

  return (
    <>
      <PageHeader
        mood="nuit"
        eyebrow={`Série · ${list.length} photographies`}
        title={<em>{s.title}</em>}
        lede={s.intro}
        aside={<p className="meta">Cliquez sur une photographie pour l&apos;agrandir</p>}
      />

      <Section mood="nuit" className="gutter pb-[clamp(6rem,12vw,10rem)]">
        <SeriesGallery photos={list} title={s.title} />
      </Section>

      <Section mood="papier" className="gutter py-[clamp(5rem,10vw,8rem)]">
        <Link href={`/galeries/${next.slug}/`} className="group grid gap-4 md:grid-cols-12 md:gap-x-8" data-cursor="Entrer">
          <span className="meta md:col-span-3">Série suivante</span>
          <span className="font-display text-display italic transition-transform duration-700 ease-reveal group-hover:translate-x-4 md:col-span-9">
            {next.title}
          </span>
        </Link>
      </Section>
    </>
  );
}
