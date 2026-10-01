<?php
declare(strict_types=1);

/**
 * POST /api/checkout  { items: [{ photo, support, format, qty }] }  →  { url }
 *
 * Les prix ne viennent jamais du navigateur : chaque ligne est recalculée à partir
 * du catalogue publié et de la grille tarifaire, résolution d'impression comprise.
 */
function create_checkout(): void
{
    Http::method('POST');
    if (!RateLimit::allow('checkout', 20, 600)) {
        Http::error('Trop de tentatives de paiement. Réessayez dans quelques minutes.', 429);
    }

    $items = Http::body()['items'] ?? null;
    if (!is_array($items) || count($items) === 0 || count($items) > 20) {
        Http::error('Votre panier est vide ou invalide.', 422);
    }

    $catalog = Catalog::published();
    $prints = Catalog::prints();
    $formats = array_column($prints['formats'], null, 'id');
    $supports = array_column($prints['supports'], null, 'id');

    $lines = [];
    foreach ($items as $item) {
        $photo = is_string($item['photo'] ?? null) ? Catalog::photo($catalog, $item['photo']) : null;
        $format = $formats[$item['format'] ?? ''] ?? null;
        $support = $supports[$item['support'] ?? ''] ?? null;
        $qty = $item['qty'] ?? null;

        if (!$photo || !$format || !$support || !is_int($qty) || $qty < 1 || $qty > 10) {
            Http::error('Une ligne de votre panier n\'est plus valide. Retirez-la puis réessayez.', 422);
        }
        if (!Catalog::printable($photo, $format, $prints)) {
            Http::error('« ' . Catalog::title($photo) . ' » n\'est plus disponible dans ce format.', 422);
        }

        $lines[] = [
            'quantity' => $qty,
            'price_data' => [
                'currency' => $prints['currency'],
                'unit_amount' => (int) $support['pricesCents'][$format['id']],
                'product_data' => [
                    'name' => Catalog::title($photo),
                    'description' => $support['name'] . ' · ' . $format['label'],
                    'metadata' => ['photo' => $photo['slug'], 'support' => $support['id'], 'format' => $format['id']],
                ],
            ],
        ];
    }

    $cfg = vl_config();
    $site = rtrim($cfg['site_url'], '/');
    $shipping = array_map(static fn (array $rate) => [
        'shipping_rate_data' => [
            'type' => 'fixed_amount',
            'display_name' => $rate['label'],
            'fixed_amount' => ['amount' => (int) $rate['amount_cents'], 'currency' => $prints['currency']],
            'delivery_estimate' => [
                'minimum' => ['unit' => 'business_day', 'value' => (int) $rate['min_days']],
                'maximum' => ['unit' => 'business_day', 'value' => (int) $rate['max_days']],
            ],
        ],
    ], $cfg['shipping']['rates']);

    $session = Stripe::request('POST', 'checkout/sessions', [
        'mode' => 'payment',
        'locale' => 'fr',
        'line_items' => $lines,
        'success_url' => $site . '/commande/merci/?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => $site . '/panier/',
        'shipping_address_collection' => ['allowed_countries' => $cfg['shipping']['countries']],
        'shipping_options' => $shipping,
        'phone_number_collection' => ['enabled' => true],
        'custom_text' => [
            'submit' => ['message' => 'En validant le paiement, vous acceptez les conditions générales de vente : ' . $site . '/cgv/'],
        ],
        'payment_intent_data' => ['description' => 'Tirages d\'art · Virginie Legoff'],
    ]);

    Http::json(['url' => $session['url']]);
}
