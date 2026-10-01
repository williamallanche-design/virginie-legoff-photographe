<?php
declare(strict_types=1);

/**
 * Traitement d'une photo envoyée depuis l'administration (extension GD).
 * Même contrat de sortie que scripts/import-photos.mjs :
 *   media/<slug>/480.webp · 960.webp · 1600.webp   (galeries, sans filigrane)
 *   media/<slug>/lightbox.webp                     (2400 px max, filigrané)
 * L'original est conservé hors de la racine web, dans data/originals/.
 */
final class Images
{
    private const WIDTHS = [480, 960, 1600];
    private const LIGHTBOX_EDGE = 2400;
    private const WATERMARK_RATIO = 0.38;
    private const MAX_BYTES = 40 * 1024 * 1024;
    private const MAX_PIXELS = 60_000_000;
    private const TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    /** @param string[] $usedSlugs */
    public static function ingest(array $upload, string $series, array $usedSlugs): array
    {
        if (!function_exists('imagewebp')) {
            throw new UserFacingError('Le serveur ne sait pas produire d\'images WebP (extension GD à activer).', 500);
        }
        if (($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($upload['tmp_name'] ?? '')) {
            $tooBig = in_array($upload['error'] ?? 0, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true);
            throw new UserFacingError($tooBig ? 'Fichier trop lourd pour le serveur (voir upload_max_filesize).' : 'Fichier non reçu.', 400);
        }
        if ($upload['size'] > self::MAX_BYTES) {
            throw new UserFacingError('Fichier trop lourd (40 Mo maximum).', 413);
        }
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($upload['tmp_name']);
        if (!isset(self::TYPES[$mime])) {
            throw new UserFacingError('Format non pris en charge : JPEG, PNG ou WebP uniquement.', 415);
        }
        $info = getimagesize($upload['tmp_name']);
        if (!$info || $info[0] * $info[1] > self::MAX_PIXELS) {
            throw new UserFacingError('Image illisible ou trop grande (60 mégapixels maximum).', 422);
        }

        @ini_set('memory_limit', '1024M');
        @set_time_limit(180);

        $base = pathinfo((string) $upload['name'], PATHINFO_FILENAME);
        $slug = self::uniqueSlug($base, $series, $usedSlugs);
        $paths = vl_config()['paths'];

        $original = Store::dir('originals') . "/$slug." . self::TYPES[$mime];
        if (!move_uploaded_file($upload['tmp_name'], $original)) {
            throw new RuntimeException('Déplacement de l\'original impossible.');
        }

        $img = self::load($original, $mime);
        $width = imagesx($img);
        $height = imagesy($img);
        $dir = rtrim($paths['media'], '/') . "/$slug";
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        foreach (self::WIDTHS as $w) {
            $scaled = $w < $width ? imagescale($img, $w, -1, IMG_BICUBIC) : $img;
            imagewebp($scaled, "$dir/$w.webp", 78);
            if ($scaled !== $img) {
                imagedestroy($scaled);
            }
        }

        $scale = min(1, self::LIGHTBOX_EDGE / max($width, $height));
        $lw = (int) round($width * $scale);
        $lightbox = $scale < 1 ? imagescale($img, $lw, -1, IMG_BICUBIC) : $img;
        self::watermark($lightbox);
        imagewebp($lightbox, "$dir/lightbox.webp", 80);

        // Couleur dominante : moyenne de l'image réduite à un pixel (imagescale renvoie du noir à cette taille).
        $pixel = imagecreatetruecolor(1, 1);
        imagecopyresampled($pixel, $img, 0, 0, 0, 0, 1, 1, $width, $height);
        $rgb = imagecolorat($pixel, 0, 0);
        $color = sprintf('#%02x%02x%02x', ($rgb >> 16) & 0xFF, ($rgb >> 8) & 0xFF, $rgb & 0xFF);
        imagedestroy($pixel);
        if ($lightbox !== $img) {
            imagedestroy($lightbox);
        }
        imagedestroy($img);

        $exif = $mime === 'image/jpeg' && function_exists('exif_read_data') ? (@exif_read_data($original) ?: []) : [];

        return [
            'slug' => $slug,
            'source' => 'admin/' . basename($original),
            'ref' => $base,
            'title' => self::title($base),
            'series' => $series,
            'place' => null,
            'date' => self::exifDate($exif),
            'featured' => false,
            'published' => true,
            'forSale' => true,
            'description' => '',
            'order' => 9999,
            'width' => $width,
            'height' => $height,
            'color' => $color,
            'exif' => self::exifSummary($exif),
        ];
    }

    /** Déplace les fichiers d'une photo supprimée vers data/trash (récupérables à la main). */
    public static function trash(string $slug): void
    {
        $trash = Store::dir('trash/' . date('Y-m-d'));
        $media = rtrim(vl_config()['paths']['media'], '/') . "/$slug";
        if (is_dir($media)) {
            rename($media, "$trash/$slug-media-" . bin2hex(random_bytes(2)));
        }
        foreach (glob(Store::dir('originals') . "/$slug.*") ?: [] as $file) {
            rename($file, "$trash/" . basename($file));
        }
    }

    private static function load(string $file, string $mime): GdImage
    {
        $img = match ($mime) {
            'image/jpeg' => imagecreatefromjpeg($file),
            'image/png' => imagecreatefrompng($file),
            'image/webp' => imagecreatefromwebp($file),
        };
        if (!$img) {
            throw new UserFacingError('Image illisible.', 422);
        }
        // Orientation EXIF des appareils photo et téléphones.
        if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
            $orientation = (int) ((@exif_read_data($file))['Orientation'] ?? 1);
            $img = match ($orientation) {
                3 => imagerotate($img, 180, 0),
                6 => imagerotate($img, -90, 0),
                8 => imagerotate($img, 90, 0),
                default => $img,
            };
        }
        return $img;
    }

    private static function watermark(GdImage $img): void
    {
        $mark = @imagecreatefrompng(dirname(__DIR__) . '/assets/watermark.png');
        if (!$mark) {
            throw new RuntimeException('Filigrane introuvable (assets/watermark.png).');
        }
        $w = (int) round(imagesx($img) * self::WATERMARK_RATIO);
        $h = (int) round(imagesy($mark) * $w / imagesx($mark));
        imagealphablending($img, true);
        imagecopyresampled(
            $img, $mark,
            (int) ((imagesx($img) - $w) / 2), (int) ((imagesy($img) - $h) / 2),
            0, 0, $w, $h, imagesx($mark), imagesy($mark),
        );
        imagedestroy($mark);
    }

    /** @param string[] $used */
    private static function uniqueSlug(string $base, string $series, array $used): string
    {
        $camera = preg_match('/^(DSC|IMG)[-_]?\d/i', $base) === 1;
        $root = self::slugify($camera ? "$series-$base" : $base) ?: 'photo';
        $slug = $root;
        for ($n = 2; in_array($slug, $used, true); $n++) {
            $slug = "$root-$n";
        }
        return $slug;
    }

    public static function slugify(string $s): string
    {
        $ascii = function_exists('transliterator_transliterate')
            ? transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $s)
            : @iconv('UTF-8', 'ASCII//TRANSLIT', $s);
        $s = strtolower($ascii ?: $s);
        $s = str_replace('&', 'et', $s);
        return trim(preg_replace('/[^a-z0-9]+/', '-', $s) ?? '', '-');
    }

    private static function title(string $base): ?string
    {
        if (preg_match('/^(DSC|IMG)[-_]?\d/i', $base)) {
            return null;
        }
        $t = str_replace('_', '’', $base);
        $t = preg_replace(['/\s*\d{1,2}\.\d{1,2}\.\d{2,4}/', '/[-\s]+\d$/', '/\s+/'], ['', '', ' '], $t) ?? $t;
        $t = trim($t);
        return $t === '' ? null : mb_strtoupper(mb_substr($t, 0, 1)) . mb_substr($t, 1);
    }

    private static function exifDate(array $exif): ?string
    {
        $raw = $exif['DateTimeOriginal'] ?? null;
        return is_string($raw) && preg_match('/^(\d{4}):(\d{2}):(\d{2})/', $raw, $m) ? "$m[1]-$m[2]-$m[3]" : null;
    }

    private static function exifSummary(array $exif): ?array
    {
        if (!$exif) {
            return null;
        }
        $num = static function (mixed $v): ?float {
            if (is_string($v) && str_contains($v, '/')) {
                [$a, $b] = array_map('floatval', explode('/', $v, 2));
                return $b ? $a / $b : null;
            }
            return is_numeric($v) ? (float) $v : null;
        };
        $exposure = $num($exif['ExposureTime'] ?? null);
        $fnumber = $num($exif['FNumber'] ?? null);
        $focal = $num($exif['FocalLength'] ?? null);
        $iso = $exif['ISOSpeedRatings'] ?? null;
        // Aucune donnée GPS n'est lue ni conservée.
        return [
            'camera' => trim(($exif['Make'] ?? '') . ' ' . ($exif['Model'] ?? '')) ?: null,
            'lens' => $exif['UndefinedTag:0xA434'] ?? null,
            'focal' => $focal ? round($focal) . ' mm' : null,
            'aperture' => $fnumber ? 'f/' . rtrim(rtrim(number_format($fnumber, 1, '.', ''), '0'), '.') : null,
            'shutter' => $exposure ? ($exposure >= 1 ? "$exposure s" : '1/' . round(1 / $exposure) . ' s') : null,
            'iso' => is_array($iso) ? (int) $iso[0] : ($iso !== null ? (int) $iso : null),
        ];
    }
}
