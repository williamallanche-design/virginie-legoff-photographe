"use client";

import { useState } from "react";
import { Lightbox } from "./Lightbox";
import type { Photo } from "@/lib/catalog";

export function ZoomButton({ photo, context }: { photo: Photo; context: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="meta link-line text-fg">
        Voir en grand
      </button>
      <Lightbox photos={[photo]} index={open ? 0 : null} onIndex={() => {}} onClose={() => setOpen(false)} context={context} />
    </>
  );
}
