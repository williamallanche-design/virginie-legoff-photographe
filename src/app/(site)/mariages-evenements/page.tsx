import type { Metadata } from "next";
import Link from "next/link";
import { RevealFade, RevealImage, RevealText } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/site/PageHeader";
import { Photo } from "@/components/site/Photo";
import { Section } from "@/components/site/Section";
import { getPhoto, photos } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Mariages & événements",
  description:
    "Reportages de mariages, d'événements privés et d'entreprise par Virginie Legoff. Chaque prestation commence par un échange par e-mail.",
};

const SERVICES = [
  {
    title: "Mariages",
    text: "Des préparatifs à la soirée, ou sur les moments que vous choisissez. Un reportage discret, attentif à la lumière du lieu autant qu'aux visages.",
  },
  {
    title: "Événements privés",
    text: "Anniversaires, baptêmes, fêtes de famille : garder la trace d'une journée sans que personne n'ait à poser.",
  },
  {
    title: "Reportages d'entreprise",
    text: "Séminaires, inaugurations, portraits d'équipe et lieux de travail, pour vos supports de communication.",
  },
];

// Le déroulé est réellement séquentiel : la numérotation porte une information.
const STEPS = [
  { title: "Premier échange par e-mail", text: "Vous présentez votre projet via le formulaire de contact : date, lieu, envies. Virginie vous répond personnellement." },
  { title: "Rendez-vous téléphonique ou visio", text: "Un créneau à réserver en ligne pour faire connaissance et préciser le déroulé de la journée." },
  { title: "Devis et réservation", text: "Un devis détaillé vous est envoyé. La date n'est réservée qu'à sa validation." },
  { title: "Le jour J", text: "Virginie photographie la journée selon le déroulé convenu ensemble." },
  { title: "Remise des images", text: "Les photographies sélectionnées et retouchées vous sont livrées en haute définition." },
];

export default function EventsPage() {
  const left = getPhoto("le-tournant-de-la-vie") ?? photos[0];
  const right = getPhoto("coeur") ?? photos[1];

  return (
    <>
      <PageHeader
        mood="papier"
        eyebrow="Mariages & événements"
        title={
          <>
            Être là, <em className="text-accent">sans se faire voir</em>
          </>
        }
        lede="Le regard qu'elle porte sur les paysages, Virginie le porte aussi sur les gens : patience, discrétion, et une attention constante à la lumière."
      />

      <Section mood="papier" className="gutter pb-[clamp(5rem,10vw,8rem)]">
        <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-8">
          <RevealImage className="relative aspect-[3/4] md:col-span-5">
            <div className="absolute inset-0">
              <Photo photo={left} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
            </div>
          </RevealImage>
          <RevealImage className="relative aspect-[4/3] self-end md:col-span-5 md:col-start-8" delay={0.15}>
            <div className="absolute inset-0">
              <Photo photo={right} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
            </div>
          </RevealImage>
        </div>
      </Section>

      <Section mood="nuit" className="gutter py-[clamp(6rem,12vw,10rem)]">
        <div className="grid gap-y-12 md:grid-cols-12 md:gap-x-8">
          <p className="meta md:col-span-3">Prestations</p>
          <div className="grid gap-12 md:col-span-9 md:grid-cols-3 md:gap-8">
            {SERVICES.map((s, i) => (
              <RevealFade key={s.title} className="grid content-start gap-4 border-t border-fg pt-6" delay={i * 0.08}>
                <h2 className="text-h3 italic">{s.title}</h2>
                <p className="text-muted">{s.text}</p>
              </RevealFade>
            ))}
          </div>
        </div>
      </Section>

      <Section mood="papier" className="gutter py-[clamp(6rem,12vw,10rem)]">
        <div className="grid gap-y-12 md:grid-cols-12 md:gap-x-8">
          <div className="grid content-start gap-6 md:col-span-4">
            <p className="meta">Déroulé</p>
            <RevealText as="h2" className="text-h2">
              Rien n&apos;est réservé <em className="text-accent">avant d&apos;avoir échangé</em>
            </RevealText>
            <p className="text-muted">
              Toute prestation fait l&apos;objet d&apos;un échange préalable par e-mail. Le rendez-vous en ligne sert à faire
              connaissance : il ne bloque pas la date.
            </p>
          </div>
          <ol className="border-t border-line md:col-span-7 md:col-start-6">
            {STEPS.map((s, i) => (
              <RevealFade
                as="li"
                key={s.title}
                className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-b border-line py-6"
                delay={i * 0.05}
              >
                <span className="font-display text-[1.6rem] leading-none text-accent italic">{i + 1}</span>
                <span className="grid gap-2">
                  <span className="text-h3">{s.title}</span>
                  <span className="text-muted">{s.text}</span>
                </span>
              </RevealFade>
            ))}
          </ol>
        </div>
      </Section>

      <Section mood="nuit" className="gutter py-[clamp(6rem,12vw,10rem)]">
        <div className="grid gap-8 md:grid-cols-12 md:gap-x-8">
          <RevealText as="h2" className="text-h1 md:col-span-8">
            Votre date est <em className="text-accent">dans l&apos;agenda</em> ?
          </RevealText>
          <RevealFade className="grid content-end gap-6 md:col-span-4">
            <p className="text-muted">Commencez par décrire votre projet. Virginie vous répond par e-mail.</p>
            <Link href="/contact/" className="btn w-fit">Présenter votre projet</Link>
          </RevealFade>
        </div>
      </Section>
    </>
  );
}
