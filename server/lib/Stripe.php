<?php
declare(strict_types=1);

/**
 * Client Stripe minimal (cURL), sans dépendance Composer.
 *
 * Le compte encaissant est celui dont la clé figure dans config.php (stripe.secret_key) :
 * brancher le compte de Virginie revient à y coller sa clé, puis à lancer tools/stripe-setup.php.
 * Clé secrète (sk_…) ou, de préférence, clé restreinte (rk_…) limitée aux droits nécessaires.
 */
final class Stripe
{
    private const API = 'https://api.stripe.com/v1/';

    /** Version de l'API figée : le format des réponses et des webhooks ne change pas sans nous. */
    public const API_VERSION = '2026-09-30.endive';

    /** Événements écoutés par le webhook (créés à l'identique par tools/stripe-setup.php). */
    public const WEBHOOK_EVENTS = [
        'checkout.session.completed',
        'checkout.session.async_payment_succeeded',
        'checkout.session.async_payment_failed',
    ];

    public static function key(): string
    {
        return (string) (vl_config()['stripe']['secret_key'] ?? '');
    }

    /** « test », « live » ou null si aucune clé n'est configurée. */
    public static function mode(?string $key = null): ?string
    {
        $key ??= self::key();
        if ($key === '') {
            return null;
        }
        return preg_match('/^(sk|rk)_live_/', $key) ? 'live' : 'test';
    }

    /** Paiement disponible : clé présente, et jamais de clé réelle sur un serveur de développement. */
    public static function enabled(): bool
    {
        $mode = self::mode();
        return $mode !== null && !($mode === 'live' && (vl_config()['env'] ?? 'production') !== 'production');
    }

    public static function request(string $method, string $path, array $params = [], ?string $idempotencyKey = null, ?string $key = null): array
    {
        $key ??= self::key();
        if ($key === '' || ($key === self::key() && !self::enabled())) {
            throw new UserFacingError('Le paiement en ligne n\'est pas encore activé.', 503);
        }

        $query = http_build_query(self::normalize($params), '', '&');
        $url = self::API . $path . ($method === 'GET' && $query !== '' ? '?' . $query : '');
        $headers = ['Content-Type: application/x-www-form-urlencoded', 'Stripe-Version: ' . self::API_VERSION];
        if ($idempotencyKey !== null && $method === 'POST') {
            // Même clé = même résultat : un double clic ne crée pas deux sessions de paiement.
            $headers[] = 'Idempotency-Key: ' . $idempotencyKey;
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERPWD => $key . ':',
            CURLOPT_TIMEOUT => 25,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
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
            $message = $data['error']['message'] ?? ($error ?: 'réponse illisible');
            Store::log('stripe.log', "$method $path → $status $message");
            throw new StripeError($message, $status);
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

/**
 * Erreur renvoyée par Stripe : le message détaillé reste dans data/logs/stripe.log,
 * le visiteur ne voit qu'un message générique (statut 502).
 */
final class StripeError extends UserFacingError
{
    public function __construct(public readonly string $detail, public readonly int $stripeStatus)
    {
        parent::__construct('Le paiement est momentanément indisponible. Réessayez dans quelques minutes.', 502);
    }
}
