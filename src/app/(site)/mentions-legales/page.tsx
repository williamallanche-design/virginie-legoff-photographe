import type { Metadata } from "next";
import { LegalPage, Todo } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalNoticePage() {
  return (
    <LegalPage eyebrow="Informations légales" title="Mentions légales" updated="octobre 2026">
      <h2>Éditrice du site</h2>
      <p>
        Virginie Legoff, <Todo>statut : entreprise individuelle, micro-entreprise…</Todo>
        <br />
        SIRET : <Todo>numéro SIRET</Todo>
        <br />
        Adresse : <Todo>adresse professionnelle</Todo>
        <br />
        E-mail : <Todo>adresse e-mail de contact</Todo>
        <br />
        TVA : <Todo>numéro de TVA intracommunautaire, ou « TVA non applicable, art. 293 B du CGI »</Todo>
      </p>
      <p>Directrice de la publication : Virginie Legoff.</p>

      <h2>Hébergement</h2>
      <p>
        o2switch, 222-224 boulevard Gustave Flaubert, 63000 Clermont-Ferrand.
        Site : o2switch.fr. <Todo>coordonnées à vérifier sur o2switch.fr au moment de la mise en ligne</Todo>
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des photographies présentées sur ce site est la propriété exclusive de Virginie Legoff et protégé
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
