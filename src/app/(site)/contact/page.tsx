import type { Metadata } from "next";
import { InquiryForm } from "@/components/booking/InquiryForm";
import { RevealText } from "@/components/motion/Reveal";
import { Section } from "@/components/site/Section";
import { site } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Contact",
  description: "Présentez votre projet de mariage, d'événement ou de tirage d'art à Virginie Legoff.",
};

export default function ContactPage() {
  return (
    <Section mood="papier" className="gutter pt-[clamp(8.5rem,20vw,15rem)] pb-[clamp(6rem,12vw,10rem)]">
      <div className="grid gap-y-14 md:grid-cols-12 md:gap-x-8">
        <div className="grid content-start gap-8 md:sticky md:top-32 md:col-span-4 md:self-start">
          <p className="meta">Contact</p>
          <RevealText as="h1" className="text-h1">
            Racontez <em className="text-accent">votre projet</em>
          </RevealText>
          <div className="grid gap-4 text-muted">
            <p>
              Pour un mariage ou un événement, la première étape est toujours un échange par e-mail. Une fois votre
              demande envoyée, vous pourrez réserver un rendez-vous téléphonique ou en visio.
            </p>
            {site.email && (
              <p>
                Ou directement :{" "}
                <a href={`mailto:${site.email}`} className="link-text text-fg">
                  {site.email}
                </a>
              </p>
            )}
          </div>
        </div>
        <div className="md:col-span-7 md:col-start-6">
          <InquiryForm />
        </div>
      </div>
    </Section>
  );
}
