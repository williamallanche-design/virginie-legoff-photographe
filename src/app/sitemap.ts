import type { MetadataRoute } from "next";
import { allSeries, photos, siteUrl } from "@/lib/catalog";

export const dynamic = "force-static";

// Pages publiques uniquement : panier, commande et administration n'ont rien à faire dans les moteurs.
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number) => ({ url: `${siteUrl}${path}`, priority });
  return [
    page("/", 1),
    page("/galeries/", 0.9),
    ...allSeries.map((s) => page(`/galeries/${s.slug}/`, 0.8)),
    page("/tirages/", 0.8),
    page("/mariages-evenements/", 0.8),
    page("/contact/", 0.6),
    ...photos.map((p) => page(`/oeuvres/${p.slug}/`, 0.5)),
    page("/cgv/", 0.2),
    page("/mentions-legales/", 0.2),
    page("/confidentialite/", 0.2),
  ];
}
