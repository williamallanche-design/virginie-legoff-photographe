<?php
// Mise en service du paiement : vérifie le compte Stripe branché dans config.php et crée le webhook.
//
//   php vl-app/tools/stripe-setup.php             diagnostic (aucune modification)
//   php vl-app/tools/stripe-setup.php --webhook   crée le point de terminaison du webhook s'il manque
//
// Brancher le compte de Virginie = coller sa clé dans config.php (stripe.secret_key), lancer
// ce script avec --webhook, puis copier la clé de signature affichée dans stripe.webhook_secret.
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/bootstrap.php';

$createWebhook = in_array('--webhook', $argv, true);
$ok = true;
$line = static fn (string $label, string $value, bool $good = true) => printf("  %s %-22s %s\n", $good ? '✓' : '✗', $label, $value);

$cfg = vl_config();
$key = Stripe::key();
$mode = Stripe::mode();
$site = rtrim((string) ($cfg['site_url'] ?? ''), '/');
$webhookUrl = $site . '/api/stripe-webhook';

echo "\nPaiement Stripe · " . ($site ?: '(site_url manquant)') . "\n\n";

if ($key === '') {
    $line('Clé API', 'absente : renseigner stripe.secret_key dans config.php', false);
    exit(1);
}
$kind = str_starts_with($key, 'rk_') ? 'clé restreinte' : 'clé secrète';
$line('Clé API', "$kind, mode " . ($mode === 'live' ? 'RÉEL (encaissements réels)' : 'TEST (aucun débit réel)'));
if (!Stripe::enabled()) {
    $line('Environnement', 'clé réelle refusée hors production (config.php : env)', false);
    exit(1);
}

// Compte encaissant (lecture facultative : une clé restreinte peut ne pas y avoir accès).
try {
    $account = Stripe::request('GET', 'account');
    $name = $account['settings']['dashboard']['display_name'] ?? $account['business_profile']['name'] ?? '(sans nom)';
    $line('Compte', sprintf('%s · %s · %s', $name, $account['id'] ?? '?', $account['country'] ?? '?'));
    if ($mode === 'live') {
        $charges = (bool) ($account['charges_enabled'] ?? false);
        $payouts = (bool) ($account['payouts_enabled'] ?? false);
        $line('Encaissements', $charges ? 'activés' : 'NON activés : terminer la vérification du compte dans le Dashboard', $charges);
        $line('Virements', $payouts ? 'activés' : 'NON activés : ajouter le RIB dans le Dashboard', $payouts);
        $ok = $ok && $charges && $payouts;
    }
} catch (StripeError $e) {
    $line('Compte', 'non lisible avec cette clé (' . $e->detail . ')', $e->stripeStatus !== 401);
    if ($e->stripeStatus === 401) {
        exit(1);
    }
}

// Webhook.
if (!str_starts_with($site, 'https://') && $mode === 'live') {
    $line('site_url', "$site : HTTPS obligatoire en mode réel", false);
    $ok = false;
}
try {
    $endpoints = Stripe::request('GET', 'webhook_endpoints', ['limit' => 100])['data'] ?? [];
    $existing = array_values(array_filter($endpoints, static fn ($e) => ($e['url'] ?? '') === $webhookUrl));

    if ($existing) {
        $endpoint = $existing[0];
        $missing = array_diff(Stripe::WEBHOOK_EVENTS, $endpoint['enabled_events'] ?? []);
        $line('Webhook', $webhookUrl . ' (' . ($endpoint['status'] ?? '?') . ')', ($endpoint['status'] ?? '') === 'enabled');
        if ($missing && !in_array('*', $endpoint['enabled_events'] ?? [], true)) {
            $line('Événements', 'manquants : ' . implode(', ', $missing), false);
            $ok = false;
        }
    } elseif ($createWebhook) {
        $endpoint = Stripe::request('POST', 'webhook_endpoints', [
            'url' => $webhookUrl,
            'enabled_events' => Stripe::WEBHOOK_EVENTS,
            'api_version' => Stripe::API_VERSION,
            'description' => 'Site virginielegoff.fr : commandes de tirages',
        ]);
        $line('Webhook', "créé : $webhookUrl");
        echo "\n  Copier cette ligne dans config.php (stripe.webhook_secret), elle ne sera plus affichée :\n\n";
        echo "    'webhook_secret' => '" . ($endpoint['secret'] ?? '') . "',\n";
    } else {
        $line('Webhook', "absent pour $webhookUrl : relancer avec --webhook", false);
        $ok = false;
    }
} catch (StripeError $e) {
    $line('Webhook', 'non vérifiable avec cette clé (' . $e->detail . ')', false);
    $ok = false;
}

$secret = (string) ($cfg['stripe']['webhook_secret'] ?? '');
$line('Clé de signature', $secret !== '' ? 'renseignée' : 'absente : stripe.webhook_secret', $secret !== '' || $createWebhook);

$to = (string) ($cfg['mail']['to'] ?? '');
$line('E-mail des commandes', $to !== '' ? $to : 'absent : mail.to', $to !== '');
$rates = $cfg['shipping']['rates'] ?? [];
$line('Livraison', count($rates) . ' tarif(s) · ' . implode(', ', $cfg['shipping']['countries'] ?? []), (bool) $rates);

echo "\n" . ($ok ? "Prêt à encaisser.\n\n" : "À compléter avant d'ouvrir la boutique.\n\n");
exit($ok ? 0 : 1);
