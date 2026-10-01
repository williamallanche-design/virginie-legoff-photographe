import { Tide } from "@/components/motion/Tide";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Tide />
      <Header />
      <main id="contenu">{children}</main>
      <Footer />
    </>
  );
}
