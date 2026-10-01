<?php
declare(strict_types=1);

/** Limitation de fréquence par adresse IP, en fichiers (fenêtre glissante). */
final class RateLimit
{
    public static function allow(string $bucket, int $max, int $windowSeconds): bool
    {
        $file = Store::dir('ratelimit') . '/' . $bucket . '-' . hash('sha256', Http::ip()) . '.json';
        $fh = fopen($file, 'c+');
        if (!$fh) {
            return true; // en cas de souci disque, on ne bloque pas les visiteurs
        }
        flock($fh, LOCK_EX);
        $now = time();
        $hits = json_decode((string) stream_get_contents($fh), true) ?: [];
        $hits = array_values(array_filter($hits, static fn ($t) => is_int($t) && $t > $now - $windowSeconds));
        $allowed = count($hits) < $max;
        if ($allowed) {
            $hits[] = $now;
        }
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($hits));
        flock($fh, LOCK_UN);
        fclose($fh);
        return $allowed;
    }
}
