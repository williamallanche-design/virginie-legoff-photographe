import Link from "next/link";
import { Tide } from "@/components/motion/Tide";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { Section } from "@/components/site/Section";

// La 404 vit hors du groupe (site) : elle reprend elle-même l'en-tête et le pied de page.
export default function NotFound() {
  return (
    <>
      <Tide />
      <Header />
      <main id="contenu">
        <Section mood="nuit" className="gutter grid min-h-dvh content-center pt-32 pb-24">
          <div className="grid gap-y-8 md:grid-cols-12 md:gap-x-8">
            <p className="meta md:col-span-3">Erreur 404</p>
            <div className="grid gap-8 md:col-span-8">
              <h1 className="text-h1">
                Cette page s&apos;est retirée <em className="text-accent">avec la marée</em>
              </h1>
              <p className="text-muted">L&apos;adresse n&apos;existe pas ou plus. Les photographies, elles, sont toujours là.</p>
              <div className="flex flex-wrap gap-4">
                <Link href="/" className="btn">Accueil</Link>
                <Link href="/galeries/" className="btn btn-ghost">Galeries</Link>
              </div>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
