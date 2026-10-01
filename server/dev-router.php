<?php
// Développement local uniquement : émule public_html/api/.htaccess pour le serveur intégré de PHP.
//   npm run php   (php -S localhost:8000 server/dev-router.php)
declare(strict_types=1);

$path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (preg_match('#^/api/(checkout|stripe-webhook|inquiry|admin/[a-z-]+)/?$#', $path, $m)) {
    $_GET['route'] = $m[1];
    putenv('VL_APP_DIR=' . __DIR__);
    require __DIR__ . '/public-api/index.php';
    return true;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo "Route inconnue : $path\n";
return true;
