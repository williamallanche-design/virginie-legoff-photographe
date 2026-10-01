<?php
declare(strict_types=1);

/**
 * POST /api/stripe-webhook  (appelé par Stripe uniquement)
 *
 * Événements écoutés : checkout.session.completed, checkout.session.async_payment_succeeded.
 * Chaque commande payée est consignée une seule fois dans data/orders/<session>.json,
 * puis Virginie et le client reçoivent un e-mail récapitulatif.
 */
function stripe_webhook(): void
{
    Http::method('POST');
    $payload = (string) file_get_contents('php://input');
    $event = Stripe::verifyWebhook($payload, $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '');

    $type = $event['type'] ?? '';
    if (!in_array($type, ['checkout.session.completed', 'checkout.session.async_payment_succeeded'], true)) {
        Http::json(['received' => true]);
    }

    $session = $event['data']['object'] ?? [];
    $id = (string) ($session['id'] ?? '');
    if (!preg_match('/^cs_[A-Za-z0-9_]+$/', $id)) {
        Http::error('Session inconnue.', 400);
    }
    if (($session['payment_status'] ?? '') !== 'paid') {
        // Paiement différé (virement…) : on attendra async_payment_succeeded.
        Http::json(['received' => true, 'pending' => true]);
    }

    $file = Store::dir('orders') . '/' . $id . '.json';
    if (is_file($file)) {
        Http::json(['received' => true, 'duplicate' => true]);
    }

    $lineItems = Stripe::request('GET', "checkout/sessions/$id/line_items", [
        'limit' => 100,
        'expand' => ['data.price.product'],
    ])['data'] ?? [];

    $customer = $session['customer_details'] ?? [];
    $shipping = $session['collected_information']['shipping_details'] ?? $session['shipping_details'] ?? null;
    $order = [
        'id' => $id,
        'createdAt' => date('c', (int) ($session['created'] ?? time())),
        'amountTotal' => (int) ($session['amount_total'] ?? 0),
        'shippingCost' => (int) ($session['shipping_cost']['amount_total'] ?? 0),
        'currency' => $session['currency'] ?? 'eur',
        'customer' => [
            'name' => $customer['name'] ?? null,
            'email' => $customer['email'] ?? null,
            'phone' => $customer['phone'] ?? null,
        ],
        'shipping' => $shipping,
        'items' => array_map(static fn (array $l) => [
            'title' => $l['price']['product']['name'] ?? $l['description'] ?? '',
            'variant' => $l['price']['product']['description'] ?? '',
            'photo' => $l['price']['product']['metadata']['photo'] ?? null,
            'quantity' => (int) ($l['quantity'] ?? 1),
            'amountTotal' => (int) ($l['amount_total'] ?? 0),
        ], $lineItems),
    ];

    // Création exclusive : si Stripe renvoie l'événement en parallèle, un seul passage écrit et notifie.
    $fh = @fopen($file, 'x');
    if ($fh === false) {
        Http::json(['received' => true, 'duplicate' => true]);
    }
    fwrite($fh, json_encode($order, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fclose($fh);
    Store::log('orders.log', "$id · " . money($order['amountTotal']) . ' · ' . ($order['customer']['email'] ?? '?'));

    $summary = order_summary($order);
    Mailer::send(
        Mailer::owner(),
        'Nouvelle commande · ' . money($order['amountTotal']) . ' · ' . ($order['customer']['name'] ?? ''),
        "Une commande vient d'être payée sur le site.\n\n$summary\n\nRéférence Stripe : $id\n",
        $order['customer']['email'],
    );
    if ($order['customer']['email']) {
        Mailer::send(
            $order['customer']['email'],
            'Votre commande de tirages · Virginie Legoff',
            "Bonjour,\n\nMerci pour votre commande. Le paiement est bien reçu et votre tirage va être préparé. "
            . "Vous recevrez un message au moment de l'expédition.\n\n$summary\n\n"
            . "Pour toute question, répondez simplement à cet e-mail.\n\nVirginie Legoff\n",
            Mailer::owner(),
        );
    }

    Http::json(['received' => true]);
}

function money(int $cents): string
{
    return number_format($cents / 100, $cents % 100 ? 2 : 0, ',', ' ') . ' €';
}

function order_summary(array $order): string
{
    $lines = array_map(
        static fn (array $i) => "- {$i['quantity']} × {$i['title']} ({$i['variant']}) : " . money($i['amountTotal']),
        $order['items'],
    );
    $address = $order['shipping']['address'] ?? null;
    $ship = $address
        ? implode("\n", array_filter([
            $order['shipping']['name'] ?? null,
            $address['line1'] ?? null,
            $address['line2'] ?? null,
            trim(($address['postal_code'] ?? '') . ' ' . ($address['city'] ?? '')),
            $address['country'] ?? null,
        ]))
        : '(adresse non communiquée)';

    return "Tirages :\n" . implode("\n", $lines)
        . "\nLivraison : " . money($order['shippingCost'])
        . "\nTotal payé : " . money($order['amountTotal'])
        . "\n\nLivraison à :\n$ship"
        . ($order['customer']['phone'] ? "\nTéléphone : {$order['customer']['phone']}" : '');
}
