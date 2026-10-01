"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ProtectedCanvas } from "./ProtectedCanvas";
import { photoAlt } from "@/components/site/Photo";
import {
  exifLine,
  formatDate,
  lightboxSrc,
  printableFormats,
  titleOf,
  type Photo as PhotoData,
} from "@/lib/catalog";
import { lockScroll, unlockScroll } from "@/lib/scroll";

type Props = {
  photos: PhotoData[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
  context?: string;
};

const TIDE = [0.65, 0, 0.35, 1] as const;
const REVEAL = [0.16, 1, 0.3, 1] as const;

const noop = () => () => {};

export function Lightbox(props: Props) {
  // Pas de portail pendant le rendu statique ni l'hydratation.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return null;
  return createPortal(<AnimatePresence>{props.index !== null && <Dialog {...props} index={props.index} />}</AnimatePresence>, document.body);
}

function Dialog({ photos, index, onIndex, onClose, context }: Props & { index: number }) {
  const dialog = useRef<HTMLDivElement>(null);
  const photo = photos[index];
  const count = photos.length;
  const go = (delta: number) => onIndex((index + delta + count) % count);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    lockScroll();
    dialog.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      unlockScroll();
      previous?.focus?.();
    };
  }, []);

  // Précharge les voisines pour une navigation sans attente.
  useEffect(() => {
    if (count < 2) return;
    for (const d of [1, -1]) {
      const img = new Image();
      img.src = lightboxSrc(photos[(index + d + count) % count]);
    }
  }, [index, count, photos]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight" && count > 1) go(1);
    if (e.key === "ArrowLeft" && count > 1) go(-1);
    if (e.key === "Tab" && dialog.current) {
      const focusables = dialog.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const wrapTo = e.shiftKey ? (document.activeElement === first ? last : null) : document.activeElement === last ? first : null;
      if (wrapTo) {
        e.preventDefault();
        wrapTo.focus();
      }
    }
  };

  const meta = [photo.place, formatDate(photo.date)].filter(Boolean).join(" · ");
  const exif = exifLine(photo);
  const forSale = printableFormats(photo).length > 0;

  return (
    <motion.div
      ref={dialog}
      data-mood="nuit"
      role="dialog"
      aria-modal="true"
      aria-label={`${titleOf(photo)}, vue agrandie`}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-[80] grid grid-rows-[auto_minmax(0,1fr)_auto] bg-bg text-fg select-none"
      initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
      exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
      transition={{ duration: 0.9, ease: TIDE }}
    >
      <div className="gutter flex items-baseline justify-between gap-6 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <span className="meta tabular-nums">
          {context ? `${context} · ` : ""}
          {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
        <button type="button" onClick={onClose} data-autofocus className="meta link-line text-fg">
          Fermer
        </button>
      </div>

      <div className="relative min-h-0 px-[clamp(16px,6vw,120px)] py-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={photo.slug}
            className="size-full"
            drag={count > 1 ? "x" : false}
            dragSnapToOrigin
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) go(1);
              if (info.offset.x > 80) go(-1);
            }}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.55, ease: REVEAL }}
          >
            <ProtectedCanvas
              src={lightboxSrc(photo)}
              width={photo.width}
              height={photo.height}
              color={photo.color}
              label={photoAlt(photo)}
            />
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Photo précédente"
              data-cursor="Préc."
              className="absolute inset-y-0 left-0 w-[18%] max-md:hidden"
            />
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Photo suivante"
              data-cursor="Suiv."
              className="absolute inset-y-0 right-0 w-[18%] max-md:hidden"
            />
          </>
        )}
      </div>

      <div className="gutter grid gap-4 border-t border-line pt-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-1">
          <p className="font-display text-h3 italic">{titleOf(photo)}</p>
          {(meta || exif) && <p className="meta">{[meta, exif].filter(Boolean).join("  ·  ")}</p>}
        </div>
        <div className="flex flex-wrap items-baseline gap-6">
          {count > 1 && (
            <span className="flex gap-5 md:hidden">
              <button type="button" onClick={() => go(-1)} className="meta link-line text-fg">
                Précédente
              </button>
              <button type="button" onClick={() => go(1)} className="meta link-line text-fg">
                Suivante
              </button>
            </span>
          )}
          {forSale && (
            <Link href={`/oeuvres/${photo.slug}/`} className="btn" onClick={onClose}>
              Commander un tirage
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}
