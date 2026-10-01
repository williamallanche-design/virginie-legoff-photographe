<?php
declare(strict_types=1);

/** Fichiers de données (zéro base de données) : écritures atomiques, verrouillées. */
final class Store
{
    public static function dir(string $sub = ''): string
    {
        $dir = rtrim(vl_config()['paths']['data'], '/') . ($sub !== '' ? '/' . $sub : '');
        if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
            throw new RuntimeException("Dossier de données impossible à créer : $dir");
        }
        return $dir;
    }

    public static function readJson(string $file): ?array
    {
        if (!is_file($file)) {
            return null;
        }
        $data = json_decode((string) file_get_contents($file), true);
        return is_array($data) ? $data : null;
    }

    /** Écrit dans un fichier temporaire puis renomme : jamais de JSON à moitié écrit. */
    public static function writeJson(string $file, array $data): void
    {
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        self::writeAtomic($file, $json);
    }

    public static function writeAtomic(string $file, string $content): void
    {
        $dir = dirname($file);
        if (!is_dir($dir)) {
            mkdir($dir, 0750, true);
        }
        $tmp = $dir . '/.' . basename($file) . '.' . bin2hex(random_bytes(4)) . '.tmp';
        if (file_put_contents($tmp, $content, LOCK_EX) === false || !rename($tmp, $file)) {
            @unlink($tmp);
            throw new RuntimeException("Écriture impossible : $file");
        }
    }

    public static function log(string $name, string $line): void
    {
        file_put_contents(self::dir('logs') . '/' . $name, '[' . date('c') . '] ' . $line . "\n", FILE_APPEND | LOCK_EX);
    }
}
