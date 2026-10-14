import type { Metadata } from "next";
import { LegalPage, Todo } from "@/components/site/LegalPage";
import { site } from "@/lib/catalog";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalNoticePage() {
  return (
    <LegalPage eyebrow="Informations légales" title="Mentions légales" updated="octobre 2026">
      <h2>Éditrice du site</h2>
      <p>
        Virginie Le Goff, entrepreneuse individuelle (micro-entreprise)
        <br />
        SIREN : 950 981 910 · SIRET : 950 981 910 00017
        <br />
        Immatriculée au Registre national des entreprises (RNE)
        <br />
        Adresse : <Todo>numéro et rue</Todo>, 22120 Pommeret
        <br />
        E-mail : <a href={`mailto:${site.email}`} className="link-text">{site.email}</a>
        <br />
        Téléphone : <Todo>numéro de téléphone</Todo>
        <br />
        TVA non applicable, art. 293 B du CGI
      </p>
      <p>Directrice de la publication : Virginie Le Goff.</p>

      <h2>Hébergement</h2>
      <p>
        o2switch SAS, chemin des Pardiaux, 63000 Clermont-Ferrand
        <br />
        RCS Clermont-Ferrand 510 909 807 · o2switch.fr
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des photographies présentées sur ce site est la propriété exclusive de Virginie Le Goff et protégé
        par le Code de la propriété intellectuelle. Toute reproduction, représentation, diffusion ou exploitation, totale ou
        partielle, sans autorisation écrite préalable est interdite. L&apos;achat d&apos;un tirage ne transfère aucun droit
        de reproduction.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement des données transmises via le formulaire de contact et lors des commandes est décrit dans la{" "}
        <a href="/confidentialite/" className="link-text">politique de confidentialité</a>.
      </p>
    </LegalPage>
  );
}
