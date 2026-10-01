import type { ReactNode } from "react";
import { Section } from "./Section";

/**
 * Gabarit des pages juridiques. Les mentions entre crochets [ … ] sont à compléter
 * par Virginie : elles sont signalées visuellement tant qu'elles restent dans le texte.
 */
export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: ReactNode }) {
  return (
    <Section mood="papier" className="gutter pt-[clamp(8.5rem,20vw,13rem)] pb-[clamp(6rem,12vw,10rem)]">
      <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-8">
        <div className="grid content-start gap-3 md:col-span-3">
          <p className="meta">{eyebrow}</p>
          <p className="meta">Mise à jour · {updated}</p>
        </div>
        <article className="legal grid gap-6 md:col-span-7">
          <h1 className="text-h1">{title}</h1>
          {children}
        </article>
      </div>
    </Section>
  );
}

/** Information manquante, mise en évidence pour ne pas être publiée par mégarde. */
export function Todo({ children }: { children: ReactNode }) {
  return <mark className="bg-lueur/30 px-1 text-fg">[{children}]</mark>;
}
