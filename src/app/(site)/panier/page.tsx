import type { Metadata } from "next";
import { Section } from "@/components/site/Section";
import { CartView } from "@/components/shop/CartView";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };

export default function CartPage() {
  return (
    <Section mood="papier" className="gutter min-h-[80vh] pt-[clamp(8.5rem,20vw,13rem)] pb-[clamp(6rem,12vw,10rem)]">
      <div className="mb-12 grid gap-y-6 md:grid-cols-12 md:gap-x-8">
        <p className="meta md:col-span-3">Panier</p>
        <h1 className="text-h1 md:col-span-9">
          Vos <em className="text-accent">tirages</em>
        </h1>
      </div>
      <CartView />
    </Section>
  );
}
