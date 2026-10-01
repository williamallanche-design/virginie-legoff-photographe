import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/site/Section";
import { PrintsIndex } from "@/components/shop/PrintsIndex";
import { allSeries, euros, forSalePhotos, prints } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Tirages d'art",
  description: "Tirages fine art des photographies de Virginie Legoff, sur papier coton Hahnemühle et Canson ou sur aluminium Dibond.",
};

export default function PrintsPage() {
  const all = prints.supports.flatMap((s) => Object.values(s.pricesCents));
  return (
    <>
      <PageHeader
        mood="papier"
        eyebrow={`Tirages d'art · ${forSalePhotos.length} photographies`}
        title={
          <>
            Des tirages à <em className="text-accent">accrocher</em>
          </>
        }
        lede={`Chaque photographie existe en ${prints.formats.map((f) => f.label).join(" et ")}, sur ${prints.supports.length} supports, de ${euros(Math.min(...all))} à ${euros(Math.max(...all))}.`}
        aside={
          <dl className="grid gap-0 border-t border-line">
            {prints.supports.map((s) => (
              <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-line py-3">
                <dt>
                  {s.name}
                  <span className="block text-[0.82rem] text-muted">{s.finish}</span>
                </dt>
                <dd className="meta self-center text-fg tabular-nums">
                  {prints.formats.map((f) => euros(s.pricesCents[f.id])).join(" · ")}
                </dd>
              </div>
            ))}
          </dl>
        }
      />
      <Section mood="papier" className="gutter pb-[clamp(6rem,12vw,10rem)]">
        <PrintsIndex photos={forSalePhotos} series={allSeries} />
      </Section>
    </>
  );
}
