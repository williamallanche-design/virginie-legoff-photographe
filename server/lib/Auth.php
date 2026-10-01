<?php
declare(strict_types=1);

/**
 * Session d'administration sans base de données :
 * mot de passe haché dans config.php, session PHP stockée dans data/sessions,
 * cookie HttpOnly + Secure + SameSite=Strict limité à /api/, jeton CSRF pour toute écriture.
 */
final class Auth
{
    public static function start(): void
    {
        $cfg = vl_config();
        $hours = (int) ($cfg['admin']['session_hours'] ?? 8);
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.gc_maxlifetime', (string) ($hours * 3600));
        session_name('vl_admin');
        session_save_path(Store::dir('sessions'));
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/api/',
            'secure' => ($cfg['env'] ?? 'production') === 'production',
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        session_start();
    }

    public static function check(): bool
    {
        return !empty($_SESSION['admin']) && ($_SESSION['expires'] ?? 0) > time();
    }

    public static function csrf(): ?string
    {
        return self::check() ? $_SESSION['csrf'] : null;
    }

    public static function login(string $password): bool
    {
        $hash = vl_config()['admin']['password_hash'] ?? '';
        if ($hash === '') {
            throw new UserFacingError('Aucun mot de passe d\'administration n\'est configuré.', 503);
        }
        if (!password_verify($password, $hash)) {
            return false;
        }
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        $_SESSION['expires'] = time() + (int) (vl_config()['admin']['session_hours'] ?? 8) * 3600;
        return true;
    }

    public static function logout(): void
    {
        $_SESSION = [];
        $p = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 3600] + array_intersect_key($p, array_flip(['path', 'domain', 'secure', 'httponly', 'samesite'])));
        session_destroy();
    }

    /** Session valide obligatoire ; jeton CSRF obligatoire pour toute requête qui modifie quelque chose. */
    public static function require(): void
    {
        if (!self::check()) {
            Http::error('Session expirée. Reconnectez-vous.', 401);
        }
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
            $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
            if (!is_string($token) || !hash_equals($_SESSION['csrf'], $token)) {
                Http::error('Jeton de sécurité invalide. Rechargez la page.', 403);
            }
        }
    }
}
