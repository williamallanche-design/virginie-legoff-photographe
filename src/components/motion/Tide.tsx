"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";

/**
 * La marée : le fond du document prend l'humeur (Papier / Nuit) de la section qui occupe
 * le centre de l'écran. Les sections déclarent leur humeur via data-mood et restent
 * transparentes ; c'est <body> qui change de couleur, en transition CSS (courbe « tide »).
 */
export function Tide() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main [data-mood]"));
    const setMood = (mood: string | undefined) => {
      if (mood) body.dataset.mood = mood;
    };
    setMood(sections[0]?.dataset.mood ?? "papier");

    const triggers = sections.map((section) =>
      ScrollTrigger.create({
        trigger: section,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => self.isActive && setMood(section.dataset.mood),
      }),
    );
    return () => triggers.forEach((t) => t.kill());
  }, [pathname]);

  return null;
}
