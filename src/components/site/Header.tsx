"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cartCount, useCart } from "@/lib/cart";
import { lockScroll, unlockScroll } from "@/lib/scroll";

const NAV = [
  { href: "/galeries/", label: "Galeries" },
  { href: "/tirages/", label: "Tirages" },
  { href: "/mariages-evenements/", label: "Mariages & événements" },
  { href: "/contact/", label: "Contact" },
];

const tide = [0.65, 0, 0.35, 1] as const;

export function Header() {
  const pathname = usePathname();
  const count = cartCount(useCart());
  // Le menu mémorise la page où il a été ouvert : changer de page le referme.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (value: boolean) => setOpenedOn(value ? pathname : null);

  useEffect(() => {
    if (!open) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenedOn(null);
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = (href: string) => pathname.startsWith(href);

  return (
    <>
      {/* mix-blend-difference : le texte Écume reste lisible sur Papier comme sur Nuit */}
      <header className="gutter pointer-events-none fixed inset-x-0 top-0 z-50 pt-[max(env(safe-area-inset-top),1.25rem)] text-ecume mix-blend-difference">
        <div className="flex items-baseline justify-between gap-6">
          <Link href="/" className="pointer-events-auto font-display text-[1.35rem] leading-none tracking-[0.01em]">
            Virginie Legoff
          </Link>

          <nav aria-label="Navigation principale" className="pointer-events-auto hidden items-baseline gap-8 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
                className="link-line font-sans text-[0.8rem] tracking-[0.14em] uppercase aria-[current=page]:link-line-on"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/panier/" className="link-line font-mono text-[0.75rem] tracking-[0.12em] uppercase">
              Panier <span className="tabular-nums">({count})</span>
            </Link>
          </nav>

          <div className="pointer-events-auto flex items-baseline gap-5 md:hidden">
            <Link href="/panier/" className="font-mono text-[0.72rem] tracking-[0.12em] uppercase">
              Panier ({count})
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              className="font-mono text-[0.72rem] tracking-[0.12em] uppercase"
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-mobile"
            data-mood="nuit"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="gutter fixed inset-0 z-[60] flex flex-col bg-bg pt-[max(env(safe-area-inset-top),1.25rem)] pb-10 text-fg"
            initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.9, ease: tide }}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display text-[1.35rem]">Virginie Legoff</span>
              <button type="button" onClick={() => setOpen(false)} className="meta" autoFocus>
                Fermer
              </button>
            </div>
            <nav aria-label="Navigation mobile" className="mt-auto grid gap-3">
              {[{ href: "/", label: "Accueil" }, ...NAV].map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.06, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link href={item.href} className="font-display text-[2.6rem] leading-[1.05] italic">
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
