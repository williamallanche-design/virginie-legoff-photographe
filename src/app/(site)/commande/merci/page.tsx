import type { Metadata } from "next";
import Link from "next/link";
import { ClearCart } from "@/components/shop/ClearCart";
import { Section } from "@/components/site/Section";

export const metadata: Metadata = { title: "Commande confirmée", robots: { index: false } };

export default function ThanksPage() {
  return (
    <Section mood="nuit" className="gutter grid min-h-dvh content-center pt-32 pb-24">
      <ClearCart />
      <div className="grid gap-y-8 md:grid-cols-12 md:gap-x-8">
        <p className="meta md:col-span-3">Commande confirmée</p>
        <div className="grid gap-8 md:col-span-8">
          <h1 className="text-h1">
            Merci pour <em className="text-accent">votre commande</em>
          </h1>
          <p className="max-w-[56ch] text-lead font-light text-muted">
            Le paiement est validé et un e-mail de confirmation vous a été envoyé. Virginie prépare votre tirage et vous écrira
            au moment de l&apos;expédition.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/galeries/" className="btn">Retour aux galeries</Link>
            <Link href="/contact/" className="btn btn-ghost">Une question ?</Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
