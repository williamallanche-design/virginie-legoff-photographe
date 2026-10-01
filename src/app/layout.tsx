import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, DM_Mono, Jost } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { Cursor } from "@/components/motion/Cursor";
import { SmoothScroll } from "@/components/motion/SmoothScroll";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Virginie Legoff · Photographe d'art & d'événements",
    template: "%s · Virginie Legoff",
  },
  description:
    "Photographies d'art de la côte bretonne, tirages fine art et reportages de mariages et d'événements par Virginie Legoff.",
  openGraph: { type: "website", locale: "fr_FR", siteName: "Virginie Legoff" },
};

export const viewport: Viewport = {
  themeColor: "#0e1011",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${bodoni.variable} ${jost.variable} ${dmMono.variable}`}>
      <body className="min-h-dvh">
        <a href="#contenu" className="meta sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:bg-encre focus:p-3 focus:text-ecume">
          Aller au contenu
        </a>
        <SmoothScroll />
        <Cursor />
        {children}
      </body>
    </html>
  );
}
