"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Reorder, useDragControls } from "motion/react";
import { API_BASE, api, ApiError } from "@/lib/api";
import type { Photo, Series } from "@/lib/catalog";

type Catalog = { series: Series[]; photos: Photo[] };
type Session = { authenticated: boolean; csrf?: string };
type Notice = { tone: "ok" | "error"; text: string } | null;

const input =
  "w-full border-0 border-b border-line bg-transparent px-0 py-2 text-fg focus:border-fg focus:outline-none";

export function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [unpublished, setUnpublished] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(
    () =>
      api<Session>("admin/session")
        .catch(() => ({ authenticated: false }) as Session)
        .then(async (s) => {
          setSession(s);
          if (!s.authenticated) return;
          const data = await api<{ catalog: Catalog; unpublished: boolean }>("admin/catalog");
          setCatalog(data.catalog);
          setUnpublished(data.unpublished);
        })
        .catch((e: Error) => setNotice({ tone: "error", text: e.message })),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (!session) return <p className="meta">Connexion au serveur…</p>;
  if (!session.authenticated) return <Login onDone={load} />;
  if (!catalog) return <p className="meta">Chargement du catalogue…</p>;

  return (
    <Dashboard
      csrf={session.csrf!}
      catalog={catalog}
      setCatalog={setCatalog}
      unpublished={unpublished}
      setUnpublished={setUnpublished}
      notice={notice}
      setNotice={setNotice}
      onLogout={() => {
        setSession({ authenticated: false });
        setCatalog(null);
      }}
    />
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("admin/login", { json: { password: new FormData(e.currentTarget).get("password") } });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connexion impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-md gap-8 pt-[10vh]">
      <div className="grid gap-3">
        <p className="meta">Administration</p>
        <h1 className="text-h2">Bonjour <em className="text-accent">Virginie</em></h1>
      </div>
      <label className="grid gap-1">
        <span className="meta">Mot de passe</span>
        <input id="admin-password" name="password" type="password" required autoComplete="current-password" className={input} />
      </label>
      <button type="submit" className="btn w-fit" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      <p role="alert" className="text-accent">{error}</p>
    </form>
  );
}

type DashboardProps = {
  csrf: string;
  catalog: Catalog;
  setCatalog: (c: Catalog) => void;
  unpublished: boolean;
  setUnpublished: (v: boolean) => void;
  notice: Notice;
  setNotice: (n: Notice) => void;
  onLogout: () => void;
};

function Dashboard({ csrf, catalog, setCatalog, unpublished, setUnpublished, notice, setNotice, onLogout }: DashboardProps) {
  const [tab, setTab] = useState(catalog.series[0]?.slug ?? "");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploads, setUploads] = useState<{ name: string; progress: number; error?: string }[]>([]);
  const saveTimer = useRef<number | undefined>(undefined);
  const headers = { "X-CSRF-Token": csrf };

  const inTab = catalog.photos.filter((p) => p.series === tab).sort((a, b) => a.order - b.order);

  // Chaque modification est enregistrée en brouillon sur le serveur (sans toucher au site en ligne).
  const commit = (next: Catalog) => {
    setCatalog(next);
    setUnpublished(true);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        await api("admin/save", { json: { catalog: next }, headers });
      } catch (e) {
        setNotice({ tone: "error", text: (e as Error).message });
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  const updatePhoto = (slug: string, patch: Partial<Photo>) =>
    commit({ ...catalog, photos: catalog.photos.map((p) => (p.slug === slug ? { ...p, ...patch } : p)) });

  const reorder = (ordered: Photo[]) => {
    const rank = new Map(ordered.map((p, i) => [p.slug, i + 1]));
    commit({ ...catalog, photos: catalog.photos.map((p) => (rank.has(p.slug) ? { ...p, order: rank.get(p.slug)! } : p)) });
  };

  const remove = (slug: string) => commit({ ...catalog, photos: catalog.photos.filter((p) => p.slug !== slug) });

  async function upload(files: FileList) {
    const list = Array.from(files);
    setUploads(list.map((f) => ({ name: f.name, progress: 0 })));
    let current = catalog;
    for (const [i, file] of list.entries()) {
      try {
        const photo = await uploadOne(file, tab, csrf, (progress) =>
          setUploads((u) => u.map((x, k) => (k === i ? { ...x, progress } : x))),
        );
        current = { ...current, photos: [...current.photos, photo] };
        setCatalog(current);
        setUnpublished(true);
      } catch (e) {
        setUploads((u) => u.map((x, k) => (k === i ? { ...x, error: (e as Error).message } : x)));
      }
    }
    window.setTimeout(() => setUploads((u) => u.filter((x) => x.error)), 2500);
  }

  async function publish() {
    setPublishing(true);
    setNotice(null);
    try {
      window.clearTimeout(saveTimer.current);
      await api("admin/save", { json: { catalog }, headers });
      await api("admin/publish", { method: "POST", headers });
      setUnpublished(false);
      setNotice({ tone: "ok", text: "Publié. Le site en ligne sera à jour dans 2 à 3 minutes." });
    } catch (e) {
      setNotice({ tone: "error", text: (e as Error).message });
    } finally {
      setPublishing(false);
    }
  }

  async function logout() {
    await api("admin/logout", { method: "POST", headers }).catch(() => {});
    onLogout();
  }

  return (
    <div className="grid gap-10">
      <header className="sticky top-0 z-10 -mx-[clamp(16px,4vw,64px)] grid gap-6 border-b border-line bg-bg px-[clamp(16px,4vw,64px)] pt-6 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="grid gap-2">
            <p className="meta">Administration · {catalog.photos.length} photographies</p>
            <h1 className="text-h2">Catalogue</h1>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <span className="meta" aria-live="polite">
              {saving ? "Enregistrement…" : unpublished ? "Modifications non publiées" : "Site à jour"}
            </span>
            <button type="button" className="btn" onClick={publish} disabled={publishing || !unpublished}>
              {publishing ? "Publication…" : "Publier"}
            </button>
            <button type="button" className="meta link-line text-fg" onClick={logout}>
              Se déconnecter
            </button>
          </div>
        </div>
        {notice && (
          <p role="status" className={notice.tone === "error" ? "text-accent" : "text-fg"}>
            {notice.text}
          </p>
        )}
        <nav aria-label="Séries" className="flex flex-wrap gap-x-8 gap-y-2">
          {catalog.series.map((s) => (
            <button
              key={s.slug}
              type="button"
              aria-pressed={tab === s.slug}
              onClick={() => setTab(s.slug)}
              className="meta link-line text-muted aria-pressed:link-line-on aria-pressed:text-fg"
            >
              {s.title} <span className="tabular-nums">{catalog.photos.filter((p) => p.series === s.slug).length}</span>
            </button>
          ))}
        </nav>
      </header>

      <label className="grid cursor-pointer place-items-center gap-2 border border-dashed border-galet px-6 py-10 text-center transition-colors hover:border-fg">
        <span className="font-display text-h3 italic">Ajouter des photographies</span>
        <span className="meta">JPEG, PNG ou WebP · 40 Mo max · série « {catalog.series.find((s) => s.slug === tab)?.title} »</span>
        <input
          id="admin-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files?.length && upload(e.target.files)}
        />
      </label>
      {uploads.length > 0 && (
        <ul className="grid gap-2">
          {uploads.map((u) => (
            <li key={u.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 text-[0.9rem]">
              <span className="truncate">{u.name}</span>
              <span className={`meta ${u.error ? "text-accent" : ""}`}>
                {u.error ?? (u.progress < 1 ? `${Math.round(u.progress * 100)} %` : "Traitée")}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="meta">Glissez les lignes par la poignée pour changer l&apos;ordre d&apos;affichage.</p>
      <Reorder.Group axis="y" values={inTab} onReorder={reorder} className="grid border-t border-line">
        {inTab.map((p) => (
          <Row
            key={p.slug}
            photo={p}
            series={catalog.series}
            onChange={(patch) => updatePhoto(p.slug, patch)}
            onDelete={() => remove(p.slug)}
          />
        ))}
      </Reorder.Group>
    </div>
  );
}

function Row({
  photo,
  series,
  onChange,
  onDelete,
}: {
  photo: Photo;
  series: Series[];
  onChange: (patch: Partial<Photo>) => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const id = `photo-${photo.slug}`;

  return (
    <Reorder.Item value={photo} dragListener={false} dragControls={controls} className="border-b border-line bg-bg">
      <div className="grid grid-cols-[auto_72px_minmax(0,1fr)_auto] items-center gap-4 py-3">
        <button
          type="button"
          aria-label={`Déplacer ${photo.title ?? photo.ref}`}
          onPointerDown={(e) => controls.start(e)}
          className="meta cursor-grab touch-none px-1 text-fg active:cursor-grabbing"
        >
          ⋮⋮
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/media/${photo.slug}/480.webp`} alt="" className="aspect-[4/3] w-[72px] object-cover" style={{ backgroundColor: photo.color }} />
        <div className="grid min-w-0 gap-0.5">
          <span className="truncate font-display text-[1.1rem] italic">{photo.title ?? <span className="text-accent">Sans titre · {photo.ref}</span>}</span>
          <span className="meta truncate">
            {[photo.published ? "Publiée" : "Masquée", photo.forSale ? "En vente" : "Hors vente", photo.featured ? "À la une" : null, photo.place]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id} className="meta link-line text-fg">
          {open ? "Fermer" : "Modifier"}
        </button>
      </div>

      {open && (
        <div id={id} className="grid gap-6 pb-8 md:grid-cols-2 md:gap-x-10">
          <label className="grid gap-1">
            <span className="meta">Titre</span>
            <input id={`${id}-title`} defaultValue={photo.title ?? ""} onBlur={(e) => onChange({ title: e.target.value.trim() || null })} className={input} />
          </label>
          <label className="grid gap-1">
            <span className="meta">Série</span>
            <select id={`${id}-series`} value={photo.series} onChange={(e) => onChange({ series: e.target.value, order: 9999 })} className={input}>
              {series.map((s) => (
                <option key={s.slug} value={s.slug}>{s.title}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="meta">Lieu</span>
            <input id={`${id}-place`} defaultValue={photo.place ?? ""} onBlur={(e) => onChange({ place: e.target.value.trim() || null })} className={input} />
          </label>
          <label className="grid gap-1">
            <span className="meta">Date de prise de vue</span>
            <input id={`${id}-date`} type="date" defaultValue={photo.date ?? ""} onChange={(e) => onChange({ date: e.target.value || null })} className={input} />
          </label>
          <label className="grid gap-1 md:col-span-2">
            <span className="meta">Texte de présentation (facultatif)</span>
            <textarea id={`${id}-description`} rows={3} defaultValue={photo.description} onBlur={(e) => onChange({ description: e.target.value.trim() })} className={`${input} resize-y`} />
          </label>
          <div className="flex flex-wrap gap-x-8 gap-y-3 md:col-span-2">
            {(
              [
                ["published", "Visible sur le site"],
                ["forSale", "Proposée en tirage"],
                ["featured", "À la une sur l'accueil"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input id={`${id}-${key}`} type="checkbox" checked={photo[key]} onChange={(e) => onChange({ [key]: e.target.checked })} className="accent-lueur" />
                {label}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 md:col-span-2">
            {confirm ? (
              <>
                <span>Supprimer définitivement cette photographie ?</span>
                <button type="button" onClick={onDelete} className="btn">Supprimer</button>
                <button type="button" onClick={() => setConfirm(false)} className="btn btn-ghost">Annuler</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className="meta link-line text-accent">
                Supprimer la photographie
              </button>
            )}
          </div>
        </div>
      )}
    </Reorder.Item>
  );
}

/** Envoi d'un fichier avec suivi de progression (fetch ne fournit pas la progression d'envoi). */
function uploadOne(file: File, series: string, csrf: string, onProgress: (p: number) => void) {
  return new Promise<Photo>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/admin/upload`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-CSRF-Token", csrf);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || "{}");
      if (xhr.status >= 200 && xhr.status < 300) resolve(data.photo);
      else reject(new Error(data.error ?? "Envoi refusé par le serveur."));
    };
    xhr.onerror = () => reject(new Error("Le serveur ne répond pas."));
    const body = new FormData();
    body.append("file", file);
    body.append("series", series);
    xhr.send(body);
  });
}
