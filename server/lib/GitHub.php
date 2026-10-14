<?php
declare(strict_types=1);

/**
 * Publication depuis l'administration : commit de content/catalog.json et content/prints.json via l'API GitHub.
 * Le push déclenche le workflow « Déploiement O2switch » (build + envoi FTPS).
 * Jeton requis : fine-grained, limité à ce dépôt, permission « Contents : read and write ».
 */
final class GitHub
{
    public static function configured(): bool
    {
        return (vl_config()['github']['token'] ?? '') !== '';
    }

    /**
     * Un seul commit pour tous les fichiers modifiés (catalogue et tarifs) : un seul déploiement.
     * API Git Data : nouvel arbre sur la base du dernier commit, puis avance de la branche.
     *
     * @param array<string, string> $files chemin dans le dépôt => contenu
     */
    public static function commitFiles(array $files, string $message): string
    {
        $cfg = vl_config()['github'];
        $git = 'https://api.github.com/repos/' . $cfg['repo'] . '/git';
        $ref = $git . '/refs/heads/' . rawurlencode($cfg['branch']);

        $parent = (string) (self::call('GET', $ref, null, [200])['object']['sha'] ?? '');
        $baseTree = (string) (self::call('GET', "$git/commits/$parent", null, [200])['tree']['sha'] ?? '');
        $entries = [];
        foreach ($files as $path => $content) {
            $entries[] = ['path' => $path, 'mode' => '100644', 'type' => 'blob', 'content' => $content];
        }
        $tree = self::call('POST', "$git/trees", ['base_tree' => $baseTree, 'tree' => $entries], [201]);
        $commit = self::call('POST', "$git/commits", ['message' => $message, 'tree' => $tree['sha'], 'parents' => [$parent]], [201]);
        // Sans « force » : si la branche a bougé entre-temps, GitHub refuse et rien n'est écrasé.
        self::call('PATCH', $ref, ['sha' => $commit['sha']], [200]);
        return (string) $commit['sha'];
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
