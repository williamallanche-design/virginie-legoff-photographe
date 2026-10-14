"use client";

import { useState, type FormEvent } from "react";
import type { PrintFormat, PrintSupport } from "@/lib/catalog";

export type Prints = { currency: string; minDpi: number; note: string; formats: PrintFormat[]; supports: PrintSupport[] };

const input =
  "w-full border-0 border-b border-line bg-transparent px-0 py-2 text-fg focus:border-fg focus:outline-none";

/** « 45 », « 45,50 », « 45.5 € » → centimes ; null si illisible. */
function parseEuros(value: string): number | null {
  const n = Number(value.replace(/\s|€/g, "").replace(",", "."));
  return value.trim() !== "" && Number.isFinite(n) ? Math.round(n * 100) : null;
}

const toEuros = (cents: number | undefined) =>
  cents === undefined ? "" : (cents / 100).toFixed(cents % 100 ? 2 : 0).replace(".", ",");

const cmLabel = (n: number) => String(n).replace(".", ",");

/**
 * Grille tarifaire : un support par ligne, un format par colonne, prix TTC en euros.
 * Les identifiants (supports, formats) sont fixés à la création : les paniers en cours restent valides.
 */
export function PricesEditor({ prints, onChange }: { prints: Prints; onChange: (p: Prints) => void }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);

  const setSupport = (id: string, patch: Partial<PrintSupport>) =>
    onChange({ ...prints, supports: prints.supports.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const setPrice = (support: PrintSupport, formatId: string, raw: string) => {
    const cents = parseEuros(raw);
    const pricesCents = { ...support.pricesCents };
    if (cents === null) delete pricesCents[formatId];
    else pricesCents[formatId] = cents;
    setSupport(support.id, { pricesCents });
  };

  const addSupport = () =>
    onChange({
      ...prints,
      supports: [...prints.supports, { id: `support-${Date.now().toString(36)}`, name: "", finish: "", pricesCents: {} }],
    });

  const removeSupport = (id: string) => {
    setConfirm(null);
    onChange({ ...prints, supports: prints.supports.filter((s) => s.id !== id) });
  };

  const removeFormat = (id: string) => {
    setConfirm(null);
    onChange({
      ...prints,
      formats: prints.formats.filter((f) => f.id !== id),
      supports: prints.supports.map((s) => {
        const pricesCents = { ...s.pricesCents };
        delete pricesCents[id];
        return { ...s, pricesCents };
      }),
    });
  };

  function addFormat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const w = Number(String(data.get("w")).replace(",", "."));
    const h = Number(String(data.get("h")).replace(",", "."));
    if (!(w >= 5 && w <= 300 && h >= 5 && h <= 300)) {
      setFormatError("Indiquez la largeur et la hauteur en centimètres, entre 5 et 300.");
      return;
    }
    const id = `${w}x${h}`.replaceAll(".", "-");
    if (prints.formats.some((f) => f.id === id)) {
      setFormatError("Ce format existe déjà.");
      return;
    }
    setFormatError(null);
    e.currentTarget.reset();
    onChange({
      ...prints,
      formats: [...prints.formats, { id, label: `${cmLabel(w)} × ${cmLabel(h)} cm`, widthCm: w, heightCm: h }],
    });
  }

  const missing = prints.supports.reduce(
    (n, s) => n + prints.formats.filter((f) => s.pricesCents[f.id] === undefined).length + (s.name ? 0 : 1),
    0,
  );

  return (
    <div className="grid gap-12">
      <div className="grid max-w-3xl gap-3">
        <p>
          Prix de vente <strong>TTC</strong>, en euros, livraison en sus. Ils s&apos;appliquent à toutes les photographies proposées
          en tirage.
        </p>
        <p className="meta">
          Un format n&apos;est proposé que pour les photos assez définies pour l&apos;imprimer net ({prints.minDpi} dpi) : un très grand
          format peut donc n&apos;apparaître que sur une partie des photos.
        </p>
        {missing > 0 && (
          <p role="status" className="text-accent">
            {missing === 1 ? "1 information manque" : `${missing} informations manquent`} (en rouge) : la publication sera possible une fois
            la grille complète.
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="meta py-3 pr-6 font-normal">Support</th>
              {prints.formats.map((f) => (
                <th key={f.id} scope="col" className="py-3 pr-6 align-bottom font-normal">
                  <span className="grid gap-1">
                    <span className="meta text-fg">{f.label}</span>
                    {confirm === `format-${f.id}` ? (
                      <span className="flex gap-3">
                        <button type="button" onClick={() => removeFormat(f.id)} className="meta link-line text-accent">Retirer</button>
                        <button type="button" onClick={() => setConfirm(null)} className="meta link-line text-fg">Annuler</button>
                      </span>
                    ) : (
                      prints.formats.length > 1 && (
                        <button type="button" onClick={() => setConfirm(`format-${f.id}`)} className="meta link-line w-fit text-muted">
                          Retirer ce format
                        </button>
                      )
                    )}
                  </span>
                </th>
              ))}
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {prints.supports.map((s) => (
              <tr key={s.id} className="border-b border-line align-top">
                <td className="min-w-[16rem] py-4 pr-6">
                  <div className="grid gap-1">
                    <label className="grid">
                      <span className="sr-only">Nom du support</span>
                      <input
                        id={`${s.id}-name`}
                        defaultValue={s.name}
                        placeholder="Nom du support"
                        onBlur={(e) => e.target.value.trim() !== s.name && setSupport(s.id, { name: e.target.value.trim() })}
                        className={`${input} font-display text-[1.1rem] italic ${s.name ? "" : "border-accent placeholder:text-accent"}`}
                      />
                    </label>
                    <label className="grid">
                      <span className="sr-only">Finition</span>
                      <input
                        id={`${s.id}-finish`}
                        defaultValue={s.finish}
                        placeholder="Finition (mat, grammage…)"
                        onBlur={(e) => e.target.value.trim() !== s.finish && setSupport(s.id, { finish: e.target.value.trim() })}
                        className={`${input} text-[0.9rem]`}
                      />
                    </label>
                  </div>
                </td>
                {prints.formats.map((f) => {
                  const price = s.pricesCents[f.id];
                  return (
                    <td key={f.id} className="py-4 pr-6">
                      <label className="flex items-baseline gap-1">
                        <span className="sr-only">Prix {s.name || "du support"} en {f.label}</span>
                        <input
                          // Remonté quand le prix change ailleurs (format retiré, rechargement).
                          key={`${f.id}-${price}`}
                          id={`${s.id}-${f.id}`}
                          inputMode="decimal"
                          defaultValue={toEuros(price)}
                          placeholder="—"
                          onBlur={(e) => parseEuros(e.target.value) !== (price ?? null) && setPrice(s, f.id, e.target.value)}
                          className={`${input} w-24 text-right tabular-nums ${price === undefined ? "border-accent placeholder:text-accent" : ""}`}
                        />
                        <span className="text-muted">€</span>
                      </label>
                    </td>
                  );
                })}
                <td className="py-4 text-right">
                  {confirm === s.id ? (
                    <span className="flex justify-end gap-3">
                      <button type="button" onClick={() => removeSupport(s.id)} className="meta link-line text-accent">Supprimer</button>
                      <button type="button" onClick={() => setConfirm(null)} className="meta link-line text-fg">Annuler</button>
                    </span>
                  ) : (
                    prints.supports.length > 1 && (
                      <button type="button" onClick={() => setConfirm(s.id)} className="meta link-line text-muted">
                        Supprimer
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-10 md:grid-cols-2 md:gap-x-16">
        <div className="grid content-start gap-3">
          <p className="meta">Nouveau support</p>
          <button type="button" onClick={addSupport} className="btn btn-ghost w-fit">Ajouter un support</button>
        </div>
        <form onSubmit={addFormat} className="grid content-start gap-3">
          <p className="meta">Nouveau format, en centimètres</p>
          <div className="flex flex-wrap items-end gap-4">
            <label className="grid gap-1">
              <span className="meta">Largeur</span>
              <input id="format-w" name="w" inputMode="decimal" className={`${input} w-20`} />
            </label>
            <span className="pb-2">×</span>
            <label className="grid gap-1">
              <span className="meta">Hauteur</span>
              <input id="format-h" name="h" inputMode="decimal" className={`${input} w-20`} />
            </label>
            <button type="submit" className="btn btn-ghost">Ajouter le format</button>
          </div>
          {formatError && <p role="alert" className="text-accent">{formatError}</p>}
        </form>
      </div>

      <label className="grid max-w-3xl gap-1">
        <span className="meta">Note affichée sous le choix du tirage</span>
        <textarea
          id="prints-note"
          rows={2}
          defaultValue={prints.note}
          onBlur={(e) => e.target.value.trim() !== prints.note && onChange({ ...prints, note: e.target.value.trim() })}
          className={`${input} resize-y`}
        />
      </label>
    </div>
  );
}
