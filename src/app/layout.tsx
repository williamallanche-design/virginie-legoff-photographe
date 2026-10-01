import type { Metadata } from "next";
import { Bodoni_Moda, DM_Mono, Jost } from "next/font/google";
import "./globals.css";

// Polices auto-hébergées au build : aucun appel à Google côté visiteur.
const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Virginie Legoff · Photographe d'art & d'événements",
    template: "%s · Virginie Legoff",
  },
  description:
    "Photographies d'art de la côte bretonne, tirages fine art et reportages de mariages et d'événements par Virginie Legoff.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${bodoni.variable} ${jost.variable} ${dmMono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
