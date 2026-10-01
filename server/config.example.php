<?php
// Copier ce fichier en vl-app/config.php sur le serveur et le compléter.
// config.php n'est jamais versionné ni déployé par GitHub Actions.
declare(strict_types=1);

return [
    'env' => 'production', // 'development' en local : cookies non « Secure » (http)

    // Adresse publique du site, sans barre finale (URLs de retour Stripe).
    'site_url' => 'https://virginielegoff.fr',

    // Origines autorisées en CORS : uniquement pour le développement local.
    'cors_origins' => [],

    'paths' => [
        // Données privées : brouillon, commandes, demandes, sessions, originaux, journaux.
        'data' => __DIR__ . '/data',
        // Catalogue et tarifs publiés (déployés par GitHub Actions).
        'content' => __DIR__ . '/content',
        // Images publiques générées à l'upload.
        'media' => dirname(__DIR__) . '/public_html/media',
    ],

    'stripe' => [
        // Dashboard Stripe → Développeurs → Clés API. Commencer avec sk_test_…
        'secret_key' => '',
        // Dashboard Stripe → Webhooks → point de terminaison https://…/api/stripe-webhook → « Clé secrète de signature ».
        'webhook_secret' => '',
    ],

    'shipping' => [
        'countries' => ['FR'], // codes ISO : ['FR', 'BE', 'LU', 'CH', 'MC']…
        'rates' => [
            // À ajuster avec Virginie : transporteur, prix et délais réels.
            ['label' => 'Colissimo suivi', 'amount_cents' => 0, 'min_days' => 5, 'max_days' => 10],
        ],
    ],

    'mail' => [
        'transport' => 'mail', // 'log' en local : écrit dans data/logs/mail.log
        'to' => '',            // adresse de Virginie (demandes et commandes)
        'from' => 'contact@virginielegoff.fr', // boîte à créer dans cPanel (SPF/DKIM actifs)
        'from_name' => 'Virginie Legoff',
    ],

    'admin' => [
        // Générer avec : php vl-app/tools/hash-password.php
        'password_hash' => '',
        'session_hours' => 8,
    ],

    'github' => [
        // Jeton fine-grained : dépôt unique, « Contents : Read and write ». Vide = publication locale seulement.
        'token' => '',
        'repo' => 'williamallanche-design/virginie-legoff-photographe',
        'branch' => 'main',
    ],
];
