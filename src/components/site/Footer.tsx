import Link from "next/link";
import { allSeries, site } from "@/lib/catalog";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer data-mood="nuit" className="gutter relative bg-bg pt-[clamp(5rem,12vw,10rem)] pb-10 text-fg">
      <div className="grid gap-16 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="meta mb-6">Prendre contact</p>
          <Link href="/contact/" className="group block font-display text-h1 italic" data-cursor="Écrire">
            Parlons de votre <span className="text-accent">projet</span>
            <span className="mt-6 block h-px origin-left scale-x-[0.18] bg-fg transition-transform duration-700 ease-reveal group-hover:scale-x-100" />
          </Link>
        </div>

        <nav aria-label="Pied de page" className="grid grid-cols-2 gap-10 self-end md:col-span-4 md:col-start-9">
          <div className="grid content-start gap-3">
            <span className="meta">Galeries</span>
            {allSeries.map((s) => (
              <Link key={s.slug} href={`/galeries/${s.slug}/`} className="link-line w-fit">
                {s.title}
              </Link>
            ))}
          </div>
          <div className="grid content-start gap-3">
            <span className="meta">Studio</span>
            <Link href="/tirages/" className="link-line w-fit">Tirages d&apos;art</Link>
            <Link href="/mariages-evenements/" className="link-line w-fit">Mariages &amp; événements</Link>
            <Link href="/contact/" className="link-line w-fit">Contact</Link>
            {site.instagram && (
              <a href={site.instagram} className="link-line w-fit" rel="noopener" target="_blank">
                Instagram
              </a>
            )}
          </div>
        </nav>
      </div>

      <div className="meta mt-[clamp(4rem,10vw,8rem)] flex flex-wrap justify-between gap-x-8 gap-y-3 border-t border-line pt-6">
        <span>© {year} Virginie Legoff · Toutes les photographies sont protégées par le droit d&apos;auteur</span>
        <span className="flex gap-6">
          <Link href="/mentions-legales/" className="link-line">Mentions légales</Link>
          <Link href="/cgv/" className="link-line">CGV</Link>
          <Link href="/confidentialite/" className="link-line">Confidentialité</Link>
        </span>
      </div>
    </footer>
  );
}
