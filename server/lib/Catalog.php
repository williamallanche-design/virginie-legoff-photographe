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

    public static function prints(): array
    {
        $file = rtrim(vl_config()['paths']['content'], '/') . '/prints.json';
        return Store::readJson($file) ?? throw new RuntimeException('Grille tarifaire introuvable.');
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
