import type { ReactNode } from "react";
import { RevealFade, RevealText } from "@/components/motion/Reveal";
import { Section } from "./Section";

type Props = {
  mood: "papier" | "nuit";
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  aside?: ReactNode;
};

/** En-tête des pages intérieures : cartel à gauche, titre éditorial, chapô décalé. */
export function PageHeader({ mood, eyebrow, title, lede, aside }: Props) {
  return (
    <Section mood={mood} className="gutter pt-[clamp(8.5rem,20vw,15rem)] pb-[clamp(3rem,8vw,7rem)]">
      <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-8">
        <p className="meta md:col-span-3">{eyebrow}</p>
        <RevealText as="h1" className="text-h1 md:col-span-9">
          {title}
        </RevealText>
        {(lede || aside) && (
          <RevealFade className="grid gap-8 md:col-span-6 md:col-start-7" delay={0.2}>
            {lede && <div className="text-lead font-light text-muted">{lede}</div>}
            {aside}
          </RevealFade>
        )}
      </div>
    </Section>
  );
}
