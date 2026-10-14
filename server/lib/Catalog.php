<?php
declare(strict_types=1);

/**
 * Catalogue en JSON.
 *  - content/catalog.json : version publiée (déployée par GitHub Actions, identique au site en ligne)
 *  - data/catalog.draft.json : brouillon de l'administration, publié sur demande
 */
final class Catalog
{
    public const EDITABLE = ['title', 'series', 'place', 'date', 'description', 'order', 'published', 'forSale', 'featured'];

    public static function publishedFile(): string
    {
        return rtrim(vl_config()['paths']['content'], '/') . '/catalog.json';
    }

    public static function draftFile(): string
    {
        return Store::dir() . '/catalog.draft.json';
    }

    public static function published(): array
    {
        return Store::readJson(self::publishedFile()) ?? throw new RuntimeException('Catalogue publié introuvable.');
    }

    public static function draft(): array
    {
        return Store::readJson(self::draftFile()) ?? self::published();
    }

    public static function saveDraft(array $catalog): void
    {
        Store::writeJson(self::draftFile(), $catalog);
    }

    public static function printsFile(): string
    {
        return rtrim(vl_config()['paths']['content'], '/') . '/prints.json';
    }

    public static function printsDraftFile(): string
    {
        return Store::dir() . '/prints.draft.json';
    }

    /** Grille tarifaire publiée : la seule qui fait foi au paiement. */
    public static function prints(): array
    {
        return Store::readJson(self::printsFile()) ?? throw new RuntimeException('Grille tarifaire introuvable.');
    }

    public static function printsDraft(): array
    {
        return Store::readJson(self::printsDraftFile()) ?? self::prints();
    }

    public static function savePrintsDraft(array $prints): void
    {
        Store::writeJson(self::printsDraftFile(), $prints);
    }

    /**
     * Grille tarifaire envoyée par l'administration, nettoyée. Le brouillon peut être incomplet
     * (prix pas encore saisi) : la vérification complète se fait à la publication (printsErrors).
     * La devise et la résolution minimale restent celles du serveur.
     */
    public static function mergePrices(array $server, array $incoming): array
    {
        $formats = [];
        foreach (array_slice($incoming['formats'] ?? [], 0, 8) as $f) {
            $w = self::cm($f['widthCm'] ?? null);
            $h = self::cm($f['heightCm'] ?? null);
            $id = is_string($f['id'] ?? null) && preg_match('/^[a-z0-9-]{1,40}$/', $f['id']) ? $f['id'] : null;
            if ($w === null || $h === null || $id === null || isset($formats[$id])) {
                continue;
            }
            $label = self::cmLabel($w) . ' × ' . self::cmLabel($h) . ' cm';
            $formats[$id] = ['id' => $id, 'label' => $label, 'widthCm' => $w, 'heightCm' => $h];
        }

        $supports = [];
        foreach (array_slice($incoming['supports'] ?? [], 0, 12) as $s) {
            $id = is_string($s['id'] ?? null) && preg_match('/^[a-z0-9-]{1,60}$/', $s['id']) ? $s['id'] : null;
            if ($id === null || isset($supports[$id])) {
                continue;
            }
            $prices = [];
            foreach (array_keys($formats) as $fid) {
                $cents = $s['pricesCents'][$fid] ?? null;
                if (is_int($cents) && $cents >= 100 && $cents <= 1_000_000) {
                    $prices[$fid] = $cents;
                }
            }
            $supports[$id] = [
                'id' => $id,
                'name' => self::text($s['name'] ?? null, 80) ?? '',
                'finish' => self::text($s['finish'] ?? null, 120) ?? '',
                'pricesCents' => $prices,
            ];
        }

        return [
            'currency' => $server['currency'],
            'minDpi' => $server['minDpi'],
            'note' => self::text($incoming['note'] ?? null, 400) ?? '',
            'formats' => array_values($formats),
            'supports' => array_values($supports),
        ];
    }

    /** Ce qui empêche de publier la grille (vide si elle est complète). */
    public static function printsErrors(array $prints): array
    {
        $errors = [];
        if (!$prints['formats']) {
            $errors[] = 'Ajoutez au moins un format.';
        }
        if (!$prints['supports']) {
            $errors[] = 'Ajoutez au moins un support.';
        }
        foreach ($prints['supports'] as $s) {
            $name = $s['name'] !== '' ? $s['name'] : 'sans nom';
            if ($s['name'] === '') {
                $errors[] = 'Un support n\'a pas de nom.';
            }
            foreach ($prints['formats'] as $f) {
                if (!isset($s['pricesCents'][$f['id']])) {
                    $errors[] = "Prix manquant : $name en {$f['label']}.";
                }
            }
        }
        return $errors;
    }

    private static function cm(mixed $value): ?float
    {
        if (!is_int($value) && !is_float($value)) {
            return null;
        }
        $value = round((float) $value, 1);
        return $value >= 5 && $value <= 300 ? $value : null;
    }

    private static function cmLabel(float $cm): string
    {
        return str_replace('.', ',', (string) ($cm == floor($cm) ? (int) $cm : $cm));
    }

    public static function photo(array $catalog, string $slug): ?array
    {
        foreach ($catalog['photos'] as $p) {
            if ($p['slug'] === $slug) {
                return $p;
            }
        }
        return null;
    }

    public static function title(array $photo): string
    {
        return $photo['title'] ?: 'Sans titre';
    }

    /** Même calcul que src/lib/catalog.ts : résolution obtenue sans recadrage. */
    public static function dpi(array $photo, array $format): int
    {
        $longPx = max($photo['width'], $photo['height']);
        $shortPx = min($photo['width'], $photo['height']);
        $longIn = max($format['widthCm'], $format['heightCm']) / 2.54;
        $shortIn = min($format['widthCm'], $format['heightCm']) / 2.54;
        return (int) round(max($longPx / $longIn, $shortPx / $shortIn));
    }

    public static function printable(array $photo, array $format, array $prints): bool
    {
        return !empty($photo['published']) && !empty($photo['forSale']) && self::dpi($photo, $format) >= $prints['minDpi'];
    }

    /**
     * Fusionne un catalogue envoyé par l'administration avec la version serveur :
     * seuls les champs éditables sont repris, les photos inconnues sont ignorées
     * (on n'ajoute une photo que par upload), les dimensions et EXIF restent ceux du serveur.
     */
    public static function mergeEdits(array $server, array $incoming): array
    {
        $seriesSlugs = array_column($server['series'], 'slug');
        $bySlug = [];
        foreach ($incoming['photos'] ?? [] as $p) {
            if (is_array($p) && isset($p['slug']) && is_string($p['slug'])) {
                $bySlug[$p['slug']] = $p;
            }
        }

        $photos = [];
        foreach ($server['photos'] as $photo) {
            $edit = $bySlug[$photo['slug']] ?? null;
            if ($edit === null) {
                continue; // supprimée dans l'administration
            }
            $photo['title'] = self::text($edit['title'] ?? null, 160);
            $photo['place'] = self::text($edit['place'] ?? null, 120);
            $photo['description'] = self::text($edit['description'] ?? '', 2000) ?? '';
            $photo['date'] = is_string($edit['date'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $edit['date']) ? $edit['date'] : null;
            $photo['series'] = in_array($edit['series'] ?? null, $seriesSlugs, true) ? $edit['series'] : $photo['series'];
            $photo['order'] = is_int($edit['order'] ?? null) ? $edit['order'] : $photo['order'];
            foreach (['published', 'forSale', 'featured'] as $flag) {
                $photo[$flag] = (bool) ($edit[$flag] ?? $photo[$flag]);
            }
            $photos[] = $photo;
        }

        // Ordre compact 1..n dans chaque série.
        usort($photos, static fn ($a, $b) => [$a['series'], $a['order']] <=> [$b['series'], $b['order']]);
        $rank = [];
        foreach ($photos as &$p) {
            $rank[$p['series']] = ($rank[$p['series']] ?? 0) + 1;
            $p['order'] = $rank[$p['series']];
        }
        unset($p);

        return ['series' => $server['series'], 'photos' => $photos];
    }

    private static function text(mixed $value, int $max): ?string
    {
        if (!is_string($value)) {
            return null;
        }
        $value = trim(preg_replace('/\s+/u', ' ', strip_tags($value)) ?? '');
        return $value === '' ? null : mb_substr($value, 0, $max);
    }
}
