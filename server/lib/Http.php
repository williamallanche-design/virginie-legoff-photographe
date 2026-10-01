<?php
declare(strict_types=1);

final class Http
{
    public static function boot(): void
    {
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: same-origin');
        header('Cache-Control: no-store');

        set_exception_handler(static function (Throwable $e): void {
            error_log('[vl-app] ' . $e::class . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
            $message = $e instanceof UserFacingError ? $e->getMessage() : 'Erreur interne. Réessayez dans un instant.';
            self::json(['error' => $message], $e instanceof UserFacingError ? $e->status : 500);
        });

        self::cors();
    }

    /** CORS uniquement pour les origines déclarées (développement local). En production, tout est sur le même domaine. */
    private static function cors(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '' && in_array($origin, vl_config()['cors_origins'] ?? [], true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Vary: Origin');
        }
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    public static function json(array $data, int $status = 200): never
    {
        http_response_code($status);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $message, int $status = 400): never
    {
        self::json(['error' => $message], $status);
    }

    public static function method(string ...$allowed): void
    {
        if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', $allowed, true)) {
            header('Allow: ' . implode(', ', $allowed));
            self::error('Méthode non autorisée.', 405);
        }
    }

    /** Corps JSON de la requête (1 Mo max). */
    public static function body(): array
    {
        $raw = file_get_contents('php://input', false, null, 0, 1_000_000);
        $data = json_decode($raw ?: '', true);
        if (!is_array($data)) {
            self::error('Requête illisible.', 400);
        }
        return $data;
    }

    public static function ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}

/** Erreur dont le message peut être montré tel quel au visiteur. */
final class UserFacingError extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 400)
    {
        parent::__construct($message);
    }
}
