"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";

/**
 * La marée : <body> prend l'humeur de la section au centre de l'écran. Les sections peignent
 * leur propre fond (contraste garanti) ; <body> ne se voit qu'aux bords (rebond du scroll mobile,
 * barres du navigateur), où il prolonge la section en cours au lieu de trancher.
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
        // Calculé après les sections épinglées, dont l'espace de défilement décale tout ce qui suit.
        refreshPriority: -1,
      }),
    );
    return () => triggers.forEach((t) => t.kill());
  }, [pathname]);

  return null;
}
