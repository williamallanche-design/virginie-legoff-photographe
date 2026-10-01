"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Affiche la version lightbox (déjà filigranée côté serveur) sur un <canvas> :
 * pas de balise <img> à enregistrer, pas de glisser-déposer, pas de menu contextuel.
 * Le fichier sans filigrane n'existe pas à cette définition sur le serveur public.
 */
export function ProtectedCanvas({ src, width, height, color, label }: {
  src: string;
  width: number;
  height: number;
  color: string;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    image.decode().then(() => alive && setImg(image)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [src]);

  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const draw = () => {
      // Taille d'affichage : l'image entière dans la boîte, sans recadrage.
      const scale = Math.min(el.clientWidth / width, el.clientHeight / height);
      const cssW = Math.floor(width * scale);
      const cssH = Math.floor(height * scale);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.style.width = `${cssW}px`;
      cv.style.height = `${cssH}px`;
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(cssH * dpr);
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, cv.width, cv.height);
      if (img) {
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [img, width, height, color]);

  return (
    <div ref={box} className="grid size-full place-items-center">
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        className={`transition-opacity duration-700 ease-tide ${img ? "opacity-100" : "opacity-60"}`}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
    </div>
  );
}
