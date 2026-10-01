<?php
declare(strict_types=1);

/** Client Stripe minimal (cURL), sans dépendance Composer. */
final class Stripe
{
    private const API = 'https://api.stripe.com/v1/';

    public static function request(string $method, string $path, array $params = []): array
    {
        $key = vl_config()['stripe']['secret_key'] ?? '';
        if ($key === '') {
            throw new UserFacingError('Le paiement en ligne n\'est pas encore activé.', 503);
        }

        $query = http_build_query(self::normalize($params), '', '&');
        $url = self::API . $path . ($method === 'GET' && $query !== '' ? '?' . $query : '');
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERPWD => $key . ':',
            CURLOPT_TIMEOUT => 25,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        ]);
        if ($method !== 'GET') {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $query);
        }

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        $data = is_string($raw) ? json_decode($raw, true) : null;
        if ($raw === false || $status >= 400 || !is_array($data)) {
            Store::log('stripe.log', "$method $path → $status " . ($data['error']['message'] ?? $error ?: 'réponse illisible'));
            throw new UserFacingError('Le paiement est momentanément indisponible. Réessayez dans quelques minutes.', 502);
        }
        return $data;
    }

    /**
     * Vérifie la signature d'un webhook (en-tête Stripe-Signature) et renvoie l'événement.
     * Schéma v1 : HMAC-SHA256 de "<timestamp>.<payload>" avec le secret du point de terminaison.
     */
    public static function verifyWebhook(string $payload, string $header, int $tolerance = 300): array
    {
        $secret = vl_config()['stripe']['webhook_secret'] ?? '';
        $timestamp = null;
        $signatures = [];
        foreach (explode(',', $header) as $part) {
            [$k, $v] = array_pad(explode('=', trim($part), 2), 2, '');
            if ($k === 't') {
                $timestamp = (int) $v;
            } elseif ($k === 'v1') {
                $signatures[] = $v;
            }
        }
        if ($secret === '' || $timestamp === null || !$signatures || abs(time() - $timestamp) > $tolerance) {
            throw new UserFacingError('Signature invalide.', 400);
        }
        $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
        foreach ($signatures as $sig) {
            if (hash_equals($expected, $sig)) {
                $event = json_decode($payload, true);
                if (is_array($event)) {
                    return $event;
                }
            }
        }
        throw new UserFacingError('Signature invalide.', 400);
    }

    /** Stripe attend "true"/"false" pour les booléens ; http_build_query produirait "1"/"0". */
    private static function normalize(array $params): array
    {
        foreach ($params as $k => $v) {
            if (is_bool($v)) {
                $params[$k] = $v ? 'true' : 'false';
            } elseif (is_array($v)) {
                $params[$k] = self::normalize($v);
            }
        }
        return $params;
    }
}
