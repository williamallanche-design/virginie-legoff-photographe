<?php
declare(strict_types=1);

require __DIR__ . '/lib/Http.php';
require __DIR__ . '/lib/Store.php';
require __DIR__ . '/lib/RateLimit.php';
require __DIR__ . '/lib/Catalog.php';
require __DIR__ . '/lib/Mailer.php';
require __DIR__ . '/lib/Stripe.php';

/** Configuration (secrets compris), lue une seule fois. Voir config.example.php. */
function vl_config(): array
{
    static $config = null;
    if ($config === null) {
        $file = __DIR__ . '/config.php';
        if (!is_file($file)) {
            Http::error('Configuration serveur absente (vl-app/config.php).', 500);
        }
        $config = require $file;
    }
    return $config;
}

function vl_route(string $route): void
{
    Http::boot();

    if (str_starts_with($route, 'admin/')) {
        require __DIR__ . '/lib/Auth.php';
        require __DIR__ . '/lib/Images.php';
        require __DIR__ . '/lib/GitHub.php';
        require __DIR__ . '/app/admin-api.php';
        admin_api(substr($route, 6));
        return;
    }

    switch ($route) {
        case 'checkout':
            require __DIR__ . '/app/create-checkout.php';
            create_checkout();
            return;
        case 'stripe-webhook':
            require __DIR__ . '/app/stripe-webhook.php';
            stripe_webhook();
            return;
        case 'inquiry':
            require __DIR__ . '/app/inquiry.php';
            inquiry();
            return;
    }

    Http::error('Adresse inconnue.', 404);
}
