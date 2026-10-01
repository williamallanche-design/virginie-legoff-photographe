import Link from "next/link";
import heroManifest from "@content/hero.json";
import { HeroScrub } from "@/components/hero/HeroScrub";
import { LiquidCarousel } from "@/components/gallery/LiquidCarousel";
import { WaveGallery } from "@/components/gallery/WaveGallery";
import { RevealFade, RevealImage, RevealText } from "@/components/motion/Reveal";
import { Photo } from "@/components/site/Photo";
import { Section } from "@/components/site/Section";
import {
  allSeries,
  euros,
  featuredPhotos,
  forSalePhotos,
  getPhoto,
  lowestPrice,
  photos,
  photosOf,
  prints,
} from "@/lib/catalog";

// Sélection : les favorites de Virginie, complétées par une photo de chaque série en alternance.
function selection(size: number) {
  const picked = [...featuredPhotos];
  const pools = allSeries.map((s) => photosOf(s.slug).filter((p) => !p.featured));
  for (let i = 0; picked.length < size && pools.some((p) => p.length); i++) {
    const next = pools[i % pools.length].shift();
    if (next) picked.push(next);
  }
  return picked.slice(0, size);
}

export default function Home() {
  const wave = selection(15);
  const inWave = new Set(wave.map((p) => p.slug));
  const carousel = forSalePhotos.filter((p) => !inWave.has(p.slug)).slice(0, 14);
  const fromPrice = Math.min(...prints.supports.flatMap((s) => Object.values(s.pricesCents)));
  const momentPhoto = getPhoto("coeur") ?? photos[0];

  return (
    <>
      <HeroScrub manifest={heroManifest} />

      <Section mood="papier" className="gutter py-[clamp(7rem,16vw,14rem)]">
        <div className="grid gap-y-12 md:grid-cols-12 md:gap-x-8">
          <p className="meta md:col-span-3">Virginie Legoff · Photographe</p>
          <RevealText as="h2" className="text-h2 md:col-span-9">
            Des paysages de la côte bretonne tirés sur papier d&apos;art, et des mariages photographiés avec la même{" "}
            <em className="text-accent">attention à la lumière</em>.
          </RevealText>
          <RevealFade className="grid gap-10 sm:grid-cols-2 md:col-span-6 md:col-start-7" delay={0.15}>
            <div className="grid content-start gap-3 border-t border-fg pt-5">
              <h3 className="text-h3">Photographie d&apos;art</h3>
              <p className="text-muted">
                {photos.length} photographies réunies en {allSeries.length} séries, proposées en tirages sur papier coton ou sur aluminium.
              </p>
              <Link href="/galeries/" className="link-text mt-2 w-fit">Parcourir les séries</Link>
            </div>
            <div className="grid content-start gap-3 border-t border-fg pt-5">
              <h3 className="text-h3">Mariages &amp; événements</h3>
              <p className="text-muted">
                Reportages de mariages, d&apos;événements privés et d&apos;entreprise, préparés ensemble lors d&apos;un premier échange.
              </p>
              <Link href="/mariages-evenements/" className="link-text mt-2 w-fit">Découvrir l&apos;approche</Link>
            </div>
          </RevealFade>
        </div>
      </Section>

      <Section mood="nuit" className="gutter py-[clamp(6rem,12vw,10rem)]">
        <div className="mb-[clamp(3rem,8vw,7rem)] grid gap-y-6 md:grid-cols-12 md:gap-x-8">
          <p className="meta md:col-span-3">Sélection</p>
          <RevealText as="h2" className="text-h1 md:col-span-6">
            Ce que la marée <em className="text-accent">découvre</em>
          </RevealText>
          <RevealFade className="self-end md:col-span-3">
            <Link href="/galeries/" className="link-text">Toutes les galeries</Link>
          </RevealFade>
        </div>
        <WaveGallery photos={wave} morph />
      </Section>

      <Section mood="papier" className="gutter py-[clamp(6rem,12vw,10rem)]">
        <div className="mb-12 grid gap-y-6 md:grid-cols-12 md:gap-x-8">
          <p className="meta md:col-span-3">Les séries</p>
          <RevealText as="h2" className="text-h2 md:col-span-9">Trois façons de regarder le même rivage</RevealText>
        </div>
        <ul className="border-t border-line">
          {allSeries.map((s) => {
            const list = photosOf(s.slug);
            return (
              <li key={s.slug} className="border-b border-line">
                <Link
                  href={`/galeries/${s.slug}/`}
                  data-cursor="Entrer"
                  className="group grid items-center gap-6 py-[clamp(1.5rem,3.5vw,3rem)] md:grid-cols-12 md:gap-x-8"
                >
                  <span className="meta tabular-nums md:col-span-3">{list.length} photographies</span>
                  <span className="font-display text-h1 italic transition-transform duration-700 ease-reveal group-hover:translate-x-4 md:col-span-5">
                    {s.title}
                  </span>
                  <span className="flex gap-3 md:col-span-4 md:justify-end">
                    {list.slice(0, 3).map((p, i) => (
                      <span
                        key={p.slug}
                        className="relative block aspect-[4/5] w-[clamp(64px,7vw,110px)] overflow-hidden transition-[clip-path] duration-700 ease-tide md:[clip-path:inset(100%_0_0_0)] md:group-hover:[clip-path:inset(0)]"
                        style={{ transitionDelay: `${i * 60}ms`, backgroundColor: p.color }}
                      >
                        <Photo photo={p} fill sizes="110px" className="object-cover" />
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section mood="nuit" className="py-[clamp(6rem,12vw,10rem)]">
        <div className="gutter mb-[clamp(3rem,6vw,5rem)] grid gap-y-6 md:grid-cols-12 md:gap-x-8">
          <p className="meta md:col-span-3">Tirages d&apos;art</p>
          <RevealText as="h2" className="text-h1 md:col-span-6">
            À accrocher <em className="text-accent">chez soi</em>
          </RevealText>
          <RevealFade className="grid content-end gap-4 md:col-span-3">
            <p className="text-muted">
              {prints.supports.length} supports, {prints.formats.length} formats, à partir de {euros(fromPrice)}.
            </p>
            <Link href="/tirages/" className="link-text w-fit">Tous les tirages</Link>
          </RevealFade>
        </div>
        <div className="pl-[clamp(16px,4vw,64px)]">
          <LiquidCarousel
            label="Tirages d'art disponibles"
            items={carousel.map((p) => ({
              photo: p,
              href: `/oeuvres/${p.slug}/`,
              caption: `dès ${euros(lowestPrice(p)!)}`,
            }))}
          />
        </div>
      </Section>

      <Section mood="papier" className="gutter py-[clamp(6rem,12vw,10rem)]">
        <div className="grid items-end gap-y-12 md:grid-cols-12 md:gap-x-8">
          <RevealImage className="relative aspect-[4/5] md:col-span-5" >
            <div className="absolute inset-0">
              <Photo photo={momentPhoto} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
            </div>
          </RevealImage>
          <div className="grid gap-8 md:col-span-6 md:col-start-7">
            <p className="meta">Mariages &amp; événements</p>
            <RevealText as="h2" className="text-h1">
              Chaque histoire commence <em className="text-accent">par un échange</em>
            </RevealText>
            <RevealFade className="grid gap-6">
              <p className="max-w-[52ch] text-lead font-light text-muted">
                Avant toute réservation, Virginie prend le temps de vous lire et de vous écrire : vos envies, le lieu, le
                déroulé de la journée. La date n&apos;est confirmée qu&apos;après cet échange par e-mail et la validation du devis.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/contact/" className="btn">Présenter votre projet</Link>
                <Link href="/mariages-evenements/" className="btn btn-ghost">L&apos;approche</Link>
              </div>
            </RevealFade>
          </div>
        </div>
      </Section>
    </>
  );
}
