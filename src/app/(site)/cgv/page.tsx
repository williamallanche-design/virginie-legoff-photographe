import type { Metadata } from "next";
import { LegalPage, Todo } from "@/components/site/LegalPage";
import { euros, prints } from "@/lib/catalog";

export const metadata: Metadata = { title: "Conditions générales de vente" };

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Tirages d'art" title="Conditions générales de vente" updated="octobre 2026">
      <p>
        <Todo>Projet de CGV à faire relire avant la mise en ligne de la boutique.</Todo>
      </p>

      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent la vente à distance de tirages photographiques par Virginie Legoff (ci-après
        « la photographe ») à des clients particuliers via ce site.
      </p>

      <h2>2. Produits</h2>
      <p>
        Les tirages sont proposés aux formats {prints.formats.map((f) => f.label).join(" et ")} sur les supports suivants :{" "}
        {prints.supports.map((s) => `${s.name} (${s.finish.toLowerCase()})`).join(", ")}. {prints.note} Les couleurs
        peuvent légèrement différer de l&apos;affichage selon l&apos;écran utilisé.
      </p>

      <h2>3. Prix</h2>
      <p>
        Les prix sont indiqués en euros, de {euros(Math.min(...prints.supports.flatMap((s) => Object.values(s.pricesCents))))} à{" "}
        {euros(Math.max(...prints.supports.flatMap((s) => Object.values(s.pricesCents))))} selon le format et le support,{" "}
        <Todo>TTC, ou « TVA non applicable, art. 293 B du CGI »</Todo>. Les frais de livraison sont indiqués avant la validation
        du paiement.
      </p>

      <h2>4. Commande et paiement</h2>
      <p>
        La commande est validée après paiement intégral par carte bancaire sur la plateforme sécurisée Stripe. Les
        coordonnées bancaires ne sont ni transmises à la photographe ni conservées par ce site. Un e-mail de confirmation
        récapitule la commande.
      </p>

      <h2>5. Fabrication et livraison</h2>
      <p>
        Chaque tirage est réalisé à la commande. Délai de fabrication : <Todo>délai</Todo>. Livraison en{" "}
        <Todo>pays desservis</Todo> par <Todo>transporteur</Todo>, dans un emballage rigide adapté. En cas de colis
        endommagé, le client émet des réserves auprès du transporteur et contacte la photographe sous 48 heures.
      </p>

      <h2>6. Droit de rétractation</h2>
      <p>
        Conformément à l&apos;article L221-18 du Code de la consommation, le client dispose de 14 jours à compter de la
        réception pour exercer son droit de rétractation, sans avoir à se justifier. Le tirage est retourné dans son
        emballage d&apos;origine, en parfait état, aux frais du client. Le remboursement intervient dans les 14 jours suivant
        la réception du retour.
      </p>

      <h2>7. Garanties légales</h2>
      <p>
        Les tirages bénéficient de la garantie légale de conformité (articles L217-3 et suivants du Code de la consommation)
        et de la garantie des vices cachés (articles 1641 et suivants du Code civil).
      </p>

      <h2>8. Propriété intellectuelle</h2>
      <p>
        L&apos;achat d&apos;un tirage confère la propriété de l&apos;objet, et non les droits d&apos;auteur sur l&apos;image.
        Toute reproduction reste interdite sans autorisation écrite.
      </p>

      <h2>9. Médiation et litiges</h2>
      <p>
        En cas de litige, le client peut recourir gratuitement au médiateur de la consommation : <Todo>nom et coordonnées du
        médiateur</Todo>. Les présentes conditions sont soumises au droit français.
      </p>
    </LegalPage>
  );
}
