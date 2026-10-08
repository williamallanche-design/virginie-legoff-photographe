import type { Metadata } from "next";
import { Section } from "@/components/site/Section";
import { OrderConfirmation } from "@/components/shop/OrderConfirmation";

export const metadata: Metadata = { title: "Commande", robots: { index: false } };

export default function ThanksPage() {
  return (
    <Section mood="nuit" className="gutter grid min-h-dvh content-center pt-32 pb-24">
      <div className="grid gap-y-8 md:grid-cols-12 md:gap-x-8">
        <p className="meta md:col-span-3">Commande</p>
        <div className="md:col-span-8">
          <OrderConfirmation />
        </div>
      </div>
    </Section>
  );
}
