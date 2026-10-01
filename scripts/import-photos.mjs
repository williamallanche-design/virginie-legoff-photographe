// Import des photos sources → variantes WebP publiques + version lightbox filigranée + catalogue JSON.
//
//   node scripts/import-photos.mjs            (ne régénère que ce qui manque)
//   node scripts/import-photos.mjs --force    (régénère toutes les images)
//   PHOTOS_SRC="D:/photos" node scripts/import-photos.mjs
//
// Contrat de sortie, identique à celui du script PHP d'upload (server/lib/Images.php) :
//   public/media/<slug>/480.webp · 960.webp · 1600.webp   → galeries, sans filigrane
//   public/media/<slug>/lightbox.webp                     → 2400 px max, filigrané
// Les champs éditables du catalogue (titre, série, ordre, publication…) ne sont jamais écrasés.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import exifReader from "exif-reader";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = process.env.PHOTOS_SRC ?? "C:/Users/Utilisateur/Downloads/virginie-legoof-photographe";
const OUT = path.join(ROOT, "public", "media");
const CATALOG = path.join(ROOT, "content", "catalog.json");
const WATERMARK = path.join(ROOT, "server", "assets", "watermark.png");
const FORCE = process.argv.includes("--force");

const WIDTHS = [480, 960, 1600];
const LIGHTBOX_EDGE = 2400;
const WATERMARK_RATIO = 0.38; // largeur du filigrane / largeur de l'image

const SERIES = [
  {
    dir: "Coucher de soleil Copyright",
    slug: "couchers-de-soleil",
    title: "Couchers de soleil",
    intro: "La dernière heure de lumière sur la Manche, quand le sable mouillé devient miroir.",
  },
  {
    dir: "N&B Copyright",
    slug: "noir-et-blanc",
    title: "Noir & blanc",
    intro: "Ciels d'orage, arbres et estran réduits à la lumière et à la matière.",
  },
  {
    dir: "Séries Mer & Ciel copyright",
    slug: "mer-et-ciel",
    title: "Mer & ciel",
    intro: "L'horizon comme seule ligne : écume, reflets d'argent et nuages en mouvement.",
  },
];
// Fichiers présents uniquement à la racine (la sélection de Virginie) : série par défaut.
const ROOT_ONLY_SERIES = "mer-et-ciel";

const PLACES = [
  [/erquy/i, "Erquy"],
  [/pl[ée]neuf|p[ée]neuf|val andr[ée]/i, "Pléneuf-Val-André"],
  [/binic/i, "Binic"],
  [/dahouet/i, "Dahouet"],
  [/fr[ée]hel/i, "Cap Fréhel"],
  [/chausey/i, "Îles Chausey"],
  [/pommeret/i, "Pommeret"],
  [/guidel/i, "Guidel"],
  [/l[ée]gu[ée]/i, "Le Légué"],
];

// Coquilles évidentes dans les noms de fichiers.
const TYPOS = [
  [/\bsolei\b/gi, "soleil"],
  [/\bP[ée]neuf\b/g, "Pléneuf"],
  [/\bPleneuf\b/g, "Pléneuf"],
  [/Barom[êe]tre/g, "Baromètre"],
  [/Spotligth/g, "Spotlight"],
  [/dété/g, "d’été"],
  [/Binic\.port/g, "Binic, le port"],
];

const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "et")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const isCameraName = (base) => /^(DSC|IMG)[-_]?\d/i.test(base);

function parseNameDate(base) {
  const m = base.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (!m) return null;
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function cleanTitle(base) {
  if (isCameraName(base)) return null;
  let t = base.replace(/_/g, "’");
  for (const [re, rep] of TYPOS) t = t.replace(re, rep);
  t = t
    .replace(/\s*\d{1,2}\.\d{1,2}\.\d{2,4}/g, "") // dates
    .replace(/\.\d{2}$/, "") // « Guidel.24 »
    .replace(/[-\s]+\d$/, "") // numéro de prise final
    .replace(/\s+/g, " ")
    .trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function placeOf(base) {
  for (const [re, place] of PLACES) if (re.test(base)) return place;
  return null;
}

function readExif(buffer) {
  if (!buffer) return {};
  try {
    const e = exifReader(buffer);
    const img = e.Image ?? {};
    const photo = e.Photo ?? {};
    const exposure = photo.ExposureTime;
    // Volontairement aucune donnée GPS : les lieux sont ceux que Virginie choisit d'afficher.
    return {
      takenAt: photo.DateTimeOriginal instanceof Date ? photo.DateTimeOriginal.toISOString().slice(0, 10) : null,
      exif: {
        camera: [img.Make, img.Model].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() || null,
        lens: photo.LensModel?.trim() || null,
        focal: photo.FocalLength ? `${Math.round(photo.FocalLength)} mm` : null,
        aperture: photo.FNumber ? `f/${Number(photo.FNumber).toFixed(1).replace(/\.0$/, "")}` : null,
        shutter: exposure ? (exposure >= 1 ? `${exposure} s` : `1/${Math.round(1 / exposure)} s`) : null,
        iso: Array.isArray(photo.ISOSpeedRatings) ? photo.ISOSpeedRatings[0] : (photo.ISOSpeedRatings ?? null),
      },
    };
  } catch {
    return {};
  }
}

async function ensureWatermark() {
  if (existsSync(WATERMARK) && !FORCE) return;
  await mkdir(path.dirname(WATERMARK), { recursive: true });
  const text = "© Virginie Legoff";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="240">
    <defs><filter id="soft" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="10"/></filter></defs>
    <text x="800" y="150" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic"
      font-size="128" letter-spacing="4" fill="#000" fill-opacity="0.22" filter="url(#soft)">${text}</text>
    <text x="800" y="150" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic"
      font-size="128" letter-spacing="4" fill="#F2F1ED" fill-opacity="0.5">${text}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(WATERMARK);
  console.log("Filigrane généré :", path.relative(ROOT, WATERMARK));
}

async function listSources() {
  const items = [];
  for (const s of SERIES) {
    const dir = path.join(SRC, s.dir);
    for (const file of (await readdir(dir)).sort((a, b) => a.localeCompare(b, "fr"))) {
      if (!/\.jpe?g$/i.test(file)) continue;
      items.push({ file: path.join(dir, file), rel: `${s.dir}/${file}`, name: file, series: s.slug, featured: false });
    }
  }
  // Racine : la sélection. Même nom qu'un fichier de série → on le marque « à la une » ;
  // version différente ou fichier absent des séries → la version racine fait foi.
  for (const file of (await readdir(SRC)).sort()) {
    if (!/\.jpe?g$/i.test(file)) continue;
    const full = path.join(SRC, file);
    const twin = items.find((i) => i.name === file);
    if (twin) {
      twin.featured = true;
      const [a, b] = await Promise.all([readFile(full), readFile(twin.file)]);
      const hash = (buf) => createHash("md5").update(buf).digest("hex");
      if (hash(a) !== hash(b)) Object.assign(twin, { file: full, rel: file });
    } else {
      items.push({ file: full, rel: file, name: file, series: ROOT_ONLY_SERIES, featured: true });
    }
  }
  return items;
}

async function processPhoto(item, slug) {
  const dir = path.join(OUT, slug);
  await mkdir(dir, { recursive: true });

  const meta = await sharp(item.file).metadata();
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;

  for (const w of WIDTHS) {
    const out = path.join(dir, `${w}.webp`);
    if (existsSync(out) && !FORCE) continue;
    await sharp(item.file).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(out);
  }

  const lightbox = path.join(dir, "lightbox.webp");
  if (!existsSync(lightbox) || FORCE) {
    const scale = Math.min(1, LIGHTBOX_EDGE / Math.max(width, height));
    const lw = Math.round(width * scale);
    const mark = await sharp(WATERMARK).resize({ width: Math.round(lw * WATERMARK_RATIO) }).toBuffer();
    await sharp(item.file)
      .rotate()
      .resize({ width: lw })
      .composite([{ input: mark, gravity: "center" }])
      .webp({ quality: 80, effort: 5 })
      .toFile(lightbox);
  }

  const { dominant } = await sharp(item.file).resize(48).stats();
  const color = "#" + [dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, "0")).join("");
  return { width, height, color, ...readExif(meta.exif) };
}

async function main() {
  await ensureWatermark();
  const previous = existsSync(CATALOG) ? JSON.parse(await readFile(CATALOG, "utf8")) : { photos: [] };
  const bySource = new Map(previous.photos.map((p) => [p.source, p]));

  const sources = await listSources();
  const usedSlugs = new Set(previous.photos.map((p) => p.slug));
  const usedTitles = new Map();
  const photos = [];

  let done = 0;
  const queue = [...sources];
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const item = queue.shift();
      const base = item.name.replace(/\.[^.]+$/, "");
      const prev = bySource.get(item.rel);

      let slug = prev?.slug;
      if (!slug) {
        const root = slugify(isCameraName(base) ? `${item.series}-${base}` : base);
        slug = root;
        for (let n = 2; usedSlugs.has(slug); n++) slug = `${root}-${n}`;
        usedSlugs.add(slug);
      }

      const computed = await processPhoto(item, slug);
      photos.push({
        slug,
        source: item.rel,
        ref: base,
        title: prev?.title ?? cleanTitle(base),
        series: prev?.series ?? item.series,
        place: prev?.place ?? placeOf(base),
        date: prev?.date ?? parseNameDate(base) ?? computed.takenAt ?? null,
        featured: prev?.featured ?? item.featured,
        published: prev?.published ?? true,
        forSale: prev?.forSale ?? true,
        description: prev?.description ?? "",
        order: prev?.order ?? null,
        width: computed.width,
        height: computed.height,
        color: computed.color,
        exif: computed.exif ?? null,
      });
      done++;
      process.stdout.write(`\r${done}/${sources.length} ${slug.padEnd(48)}`);
    }
  });
  await Promise.all(workers);
  process.stdout.write("\n");

  // Ordre stable : celui du catalogue existant, puis l'ordre alphabétique des fichiers.
  const sourceIndex = new Map(sources.map((s, i) => [s.rel, i]));
  photos.sort((a, b) => sourceIndex.get(a.source) - sourceIndex.get(b.source));
  for (const s of SERIES) {
    const inSeries = photos.filter((p) => p.series === s.slug);
    inSeries.sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || sourceIndex.get(a.source) - sourceIndex.get(b.source));
    inSeries.forEach((p, i) => (p.order = i + 1));
  }

  // Titres identiques au sein d'une série : on numérote (II, III…) au lieu de laisser des doublons.
  const roman = ["", "", " II", " III", " IV", " V", " VI"];
  for (const p of photos.sort((a, b) => a.series.localeCompare(b.series) || a.order - b.order)) {
    if (!p.title || bySource.get(p.source)?.title) continue;
    const key = `${p.series}:${p.title}`;
    const n = (usedTitles.get(key) ?? 0) + 1;
    usedTitles.set(key, n);
    if (n > 1) p.title += roman[n] ?? ` ${n}`;
  }

  const catalog = {
    series: SERIES.map(({ slug, title, intro }, i) => {
      const prev = previous.series?.find((s) => s.slug === slug);
      return { slug, title: prev?.title ?? title, intro: prev?.intro ?? intro, order: prev?.order ?? i + 1 };
    }),
    photos,
  };
  await writeFile(CATALOG, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`Catalogue : ${photos.length} photos → ${path.relative(ROOT, CATALOG)}`);
  const untitled = photos.filter((p) => !p.title).map((p) => p.ref);
  if (untitled.length) console.log(`Sans titre (${untitled.length}) : ${untitled.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
