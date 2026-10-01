"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { api, ApiError } from "@/lib/api";
import { site } from "@/lib/catalog";

const TYPES = [
  { id: "mariage", label: "Mariage", event: true },
  { id: "evenement-prive", label: "Événement privé", event: true },
  { id: "entreprise", label: "Reportage d'entreprise", event: true },
  { id: "tirage", label: "Tirage d'art", event: false },
  { id: "autre", label: "Autre demande", event: false },
] as const;

type TypeId = (typeof TYPES)[number]["id"];
const REVEAL = [0.16, 1, 0.3, 1] as const;

const field =
  "w-full border-0 border-b border-line bg-transparent px-0 py-3 text-fg placeholder:text-muted/70 focus:border-fg focus:outline-none focus-visible:outline-none transition-colors duration-300";

export function InquiryForm() {
  const [type, setType] = useState<TypeId>("mariage");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sentType, setSentType] = useState<TypeId | null>(null);
  // Temps passé sur le formulaire : un robot le remplit en moins de 3 secondes.
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const isEvent = TYPES.find((t) => t.id === type)!.event;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setStatus("sending");
    try {
      await api("inquiry", { json: { ...data, type, elapsed: Date.now() - startedAt.current } });
      setSentType(type);
      setStatus("sent");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "L'envoi n'a pas abouti. Réessayez dans un instant.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    const event = TYPES.find((t) => t.id === sentType)?.event;
    return <Confirmation event={!!event} />;
  }

  return (
    <form onSubmit={submit} className="grid gap-10" noValidate={false}>
      <fieldset className="grid gap-4">
        <legend className="meta mb-4">Votre demande concerne</legend>
        <div className="flex flex-wrap gap-x-7 gap-y-3">
          {TYPES.map((t) => (
            <label key={t.id} className="cursor-pointer">
              <input
                type="radio"
                name="type-choice"
                value={t.id}
                checked={type === t.id}
                onChange={() => setType(t.id)}
                className="peer sr-only"
              />
              <span className="link-line font-display text-[1.35rem] text-muted italic transition-colors peer-checked:link-line-on peer-checked:text-fg peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-accent">
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-8 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="meta">Nom et prénom *</span>
          <input id="inquiry-name" name="name" required autoComplete="name" maxLength={120} className={field} />
        </label>
        <label className="grid gap-1">
          <span className="meta">E-mail *</span>
          <input id="inquiry-email" name="email" type="email" required autoComplete="email" maxLength={160} className={field} />
        </label>
        <label className="grid gap-1">
          <span className="meta">Téléphone</span>
          <input id="inquiry-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} className={field} />
        </label>

        <AnimatePresence initial={false}>
          {isEvent && (
            <motion.div
              key="event-fields"
              className="contents"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: REVEAL }}
            >
              <label className="grid gap-1">
                <span className="meta">Date envisagée</span>
                <input id="inquiry-date" name="eventDate" type="date" className={field} />
              </label>
              <label className="grid gap-1">
                <span className="meta">Lieu</span>
                <input id="inquiry-place" name="place" maxLength={160} placeholder="Commune, domaine…" className={field} />
              </label>
              <label className="grid gap-1">
                <span className="meta">Nombre d&apos;invités</span>
                <input id="inquiry-guests" name="guests" inputMode="numeric" maxLength={10} className={field} />
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <label className="grid gap-1">
        <span className="meta">Votre message *</span>
        <textarea
          id="inquiry-message"
          name="message"
          required
          rows={6}
          maxLength={4000}
          placeholder={isEvent ? "Le déroulé de la journée, ce qui compte pour vous…" : "Votre question…"}
          className={`${field} resize-y`}
        />
      </label>

      {/* Piège à robots : invisible pour les humains. */}
      <label className="absolute -left-[9999px]" aria-hidden>
        Site web
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <label className="flex items-start gap-3 text-[0.9rem] text-muted">
        <input id="inquiry-consent" name="consent" type="checkbox" required value="1" className="mt-1 accent-lueur" />
        <span>
          J&apos;accepte que mes informations soient utilisées pour répondre à ma demande. Elles ne sont ni revendues ni
          utilisées à d&apos;autres fins (voir la{" "}
          <a href="/confidentialite/" className="link-text text-fg">politique de confidentialité</a>).
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-6">
        <button type="submit" className="btn" disabled={status === "sending"}>
          {status === "sending" ? "Envoi…" : "Envoyer la demande"}
        </button>
        <p role="alert" aria-live="assertive" className="text-[0.95rem] text-accent">
          {error}
        </p>
      </div>
    </form>
  );
}

function Confirmation({ event }: { event: boolean }) {
  return (
    <motion.div
      className="grid gap-10"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: REVEAL }}
      role="status"
    >
      <div className="grid gap-4">
        <p className="meta">Demande envoyée</p>
        <p className="text-h2 font-display italic">Merci, votre message est bien parti.</p>
        <p className="max-w-[56ch] text-muted">
          Virginie vous répond personnellement par e-mail.
          {event && " Vous pouvez dès maintenant réserver un premier rendez-vous téléphonique ou en visio."}
        </p>
      </div>

      {event && (
        <div className="grid gap-6 border-t border-fg pt-8">
          <div className="grid gap-2 border-l border-accent pl-5">
            <p className="meta text-accent">À lire avant de choisir un créneau</p>
            <p className="max-w-[60ch]">
              Ce rendez-vous sert à faire connaissance et à préciser votre projet. Il ne réserve pas la date de votre
              événement : celle-ci n&apos;est confirmée qu&apos;après notre échange par e-mail et la validation du devis.
            </p>
          </div>
          {site.calendlyUrl ? (
            <iframe
              title="Réserver un rendez-vous avec Virginie Legoff"
              src={`${site.calendlyUrl}?hide_gdpr_banner=1&background_color=f2f1ed&text_color=15181a&primary_color=8f5a24`}
              className="h-[720px] w-full border border-line bg-papier"
              loading="lazy"
            />
          ) : (
            <p className="text-muted">
              La prise de rendez-vous en ligne sera bientôt disponible. Virginie vous proposera un créneau dans sa réponse.
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
