import type { Metadata } from "next";
import { LegalPage, Todo } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Données personnelles" title="Politique de confidentialité" updated="octobre 2026">
      <h2>Responsable du traitement</h2>
      <p>
        Virginie Legoff, joignable à <Todo>adresse e-mail de contact</Todo>.
      </p>

      <h2>Données collectées</h2>
      <p>
        <strong className="font-medium">Formulaire de contact :</strong> nom, e-mail, téléphone (facultatif), informations
        sur l&apos;événement et message. Ces données servent uniquement à répondre à la demande et sont conservées 3 ans
        après le dernier échange.
      </p>
      <p>
        <strong className="font-medium">Commandes :</strong> nom, e-mail, téléphone et adresse de livraison, transmis par
        Stripe après le paiement. Ils servent à fabriquer et expédier la commande et sont conservés pendant la durée légale
        de conservation des pièces comptables (10 ans). Les données bancaires sont traitées exclusivement par Stripe.
      </p>

      <h2>Services tiers</h2>
      <p>
        Paiement : Stripe Payments Europe. Prise de rendez-vous : Calendly, qui applique sa propre politique de
        confidentialité lors de la réservation. Hébergement : o2switch, en France.
      </p>

      <h2>Cookies</h2>
      <p>
        Ce site ne dépose aucun cookie publicitaire ni de mesure d&apos;audience. Le panier est conservé dans le stockage
        local de votre navigateur et ne quitte pas votre appareil avant le paiement.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement et d&apos;opposition sur vos
        données. Pour l&apos;exercer, écrivez à <Todo>adresse e-mail de contact</Todo>. Vous pouvez également saisir la
        CNIL (cnil.fr).
      </p>
    </LegalPage>
  );
}
