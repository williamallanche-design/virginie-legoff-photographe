import type { Metadata } from "next";
import Link from "next/link";
import { RevealFade, RevealImage, RevealText } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/site/PageHeader";
import { Photo } from "@/components/site/Photo";
import { Section } from "@/components/site/Section";
import { allSeries, photos, photosOf } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Galeries",
  description: "Couchers de soleil, noir & blanc, mer & ciel : les séries photographiques de Virginie Legoff.",
};

// Composition asymétrique de chaque série : une grande image, deux petites décalées.
const LAYOUTS = [
  { big: "md:col-span-7", small: "md:col-span-4 md:col-start-9", text: "md:col-span-5 md:col-start-8" },
  { big: "md:col-span-6 md:col-start-7 md:row-start-1", small: "md:col-span-4 md:col-start-2 md:row-start-1", text: "md:col-span-5 md:col-start-1" },
];

export default function GalleriesPage() {
  return (
    <>
      <PageHeader
        mood="papier"
        eyebrow={`Galeries · ${photos.length} photographies`}
        title={
          <>
            Le même rivage, <em className="text-accent">trois lumières</em>
          </>
        }
        lede="Erquy, Pléneuf-Val-André, Binic, le cap Fréhel : des lieux arpentés à toutes les saisons, regroupés selon ce qu'ils ont donné à voir."
      />

      {allSeries.map((s, i) => {
        const list = photosOf(s.slug);
        const [cover, second, third] = list.filter((p) => p.featured).concat(list.filter((p) => !p.featured));
        const layout = LAYOUTS[i % 2];
        return (
          <Section key={s.slug} mood={i % 2 ? "papier" : "nuit"} className="gutter py-[clamp(5rem,11vw,9rem)]">
            <Link href={`/galeries/${s.slug}/`} className="group grid gap-y-10 md:grid-cols-12 md:gap-x-8" data-cursor="Entrer">
              <RevealImage className={`relative aspect-[5/4] ${layout.big}`}>
                <div className="absolute inset-0 transition-transform duration-[1.4s] ease-reveal group-hover:scale-[1.03]">
                  <Photo photo={cover} fill sizes="(min-width: 768px) 58vw, 100vw" className="object-cover" />
                </div>
              </RevealImage>
              <div className={`grid grid-cols-2 gap-4 self-end ${layout.small}`}>
                {[second, third].filter(Boolean).map((p, k) => (
                  <RevealImage key={p.slug} className={`relative aspect-[4/5] ${k ? "mt-[30%]" : ""}`} delay={0.1 * (k + 1)}>
                    <div className="absolute inset-0">
                      <Photo photo={p} fill sizes="(min-width: 768px) 16vw, 50vw" className="object-cover" />
                    </div>
                  </RevealImage>
                ))}
              </div>
              <div className={`grid gap-5 ${layout.text}`}>
                <span className="meta tabular-nums">{list.length} photographies</span>
                <RevealText as="h2" className="text-h1 italic">
                  {s.title}
                </RevealText>
                <RevealFade className="grid gap-5">
                  <p className="max-w-[44ch] text-muted">{s.intro}</p>
                  <span className="link-text w-fit">Voir la série</span>
                </RevealFade>
              </div>
            </Link>
          </Section>
        );
      })}
    </>
  );
}
