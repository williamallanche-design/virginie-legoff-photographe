<?php
declare(strict_types=1);

/**
 * Publication du catalogue : commit de content/catalog.json via l'API GitHub.
 * Le push déclenche le workflow « Déploiement O2switch » (build + envoi FTPS).
 * Jeton requis : fine-grained, limité à ce dépôt, permission « Contents : read and write ».
 */
final class GitHub
{
    public static function configured(): bool
    {
        return (vl_config()['github']['token'] ?? '') !== '';
    }

    public static function putFile(string $path, string $content, string $message): string
    {
        $cfg = vl_config()['github'];
        $url = 'https://api.github.com/repos/' . $cfg['repo'] . '/contents/' . $path;

        $current = self::call('GET', $url . '?ref=' . rawurlencode($cfg['branch']), null, [200, 404]);
        $body = [
            'message' => $message,
            'content' => base64_encode($content),
            'branch' => $cfg['branch'],
        ];
        if (isset($current['sha'])) {
            $body['sha'] = $current['sha'];
        }
        $result = self::call('PUT', $url, $body, [200, 201]);
        return (string) ($result['commit']['sha'] ?? '');
    }

    private static function call(string $method, string $url, ?array $body, array $okStatuses): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . vl_config()['github']['token'],
                'Accept: application/vnd.github+json',
                'X-GitHub-Api-Version: 2022-11-28',
                'User-Agent: vl-admin',
                'Content-Type: application/json',
            ],
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        $data = is_string($raw) ? json_decode($raw, true) : null;
        if (!in_array($status, $okStatuses, true)) {
            Store::log('github.log', "$method $url → $status " . ($data['message'] ?? ''));
            throw new UserFacingError('La publication vers GitHub a échoué. Réessayez dans quelques minutes.', 502);
        }
        return is_array($data) ? $data : [];
    }
}
