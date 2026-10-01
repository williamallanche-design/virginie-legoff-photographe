"use client";

import { useState } from "react";
import { WaveGallery } from "./WaveGallery";
import { Lightbox } from "@/components/lightbox/Lightbox";
import { formatDate, type Photo } from "@/lib/catalog";

/** Galerie d'une série : la cascade ouvre la lightbox filigranée. */
export function SeriesGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  return (
    <>
      <WaveGallery
        photos={photos}
        onOpen={setIndex}
        labelOf={(p) => p.place ?? (p.date ? formatDate(p.date) : null)}
      />
      <Lightbox photos={photos} index={index} onIndex={setIndex} onClose={() => setIndex(null)} context={title} />
    </>
  );
}
