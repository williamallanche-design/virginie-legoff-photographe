<?php
declare(strict_types=1);

/**
 * GET /api/payment-status  →  { enabled, mode }
 * Permet au panier d'annoncer clairement un paiement indisponible ou en mode test.
 */
function payment_status(): void
{
    Http::method('GET');
    Http::json(['enabled' => Stripe::enabled(), 'mode' => Stripe::enabled() ? Stripe::mode() : null]);
}

/**
 * GET /api/order?session_id=cs_…  →  récapitulatif de la commande pour la page « merci ».
 *
 * L'état est lu chez Stripe : on ne vide le panier et n'affiche « payée » que si c'est vrai.
 * Seules des informations non sensibles sont renvoyées (prénom, montants, articles).
 */
function order_status(): void
{
    Http::method('GET');
    if (!RateLimit::allow('order', 30, 600)) {
        Http::error('Trop de requêtes. Réessayez dans quelques minutes.', 429);
    }
    $id = (string) ($_GET['session_id'] ?? '');
    if (!preg_match('/^cs_(test|live)_[A-Za-z0-9]{10,200}$/', $id)) {
        Http::error('Commande introuvable.', 404);
    }

    try {
        $session = Stripe::request('GET', "checkout/sessions/$id", ['expand' => ['line_items']]);
    } catch (StripeError $e) {
        Http::error($e->stripeStatus === 404 ? 'Commande introuvable.' : $e->getMessage(), $e->stripeStatus === 404 ? 404 : 502);
    }

    $name = trim((string) ($session['customer_details']['name'] ?? ''));
    Http::json([
        'status' => match (true) {
            ($session['payment_status'] ?? '') === 'paid' => 'paid',
            ($session['status'] ?? '') === 'complete' => 'processing', // paiement différé en attente
            ($session['status'] ?? '') === 'expired' => 'expired',
            default => 'open',
        },
        'firstName' => $name !== '' ? explode(' ', $name)[0] : null,
        'amountTotal' => (int) ($session['amount_total'] ?? 0),
        'shippingCost' => (int) ($session['shipping_cost']['amount_total'] ?? 0),
        'currency' => $session['currency'] ?? 'eur',
        'items' => array_map(static fn (array $l) => [
            'title' => $l['description'] ?? '',
            'quantity' => (int) ($l['quantity'] ?? 1),
            'amountTotal' => (int) ($l['amount_total'] ?? 0),
        ], $session['line_items']['data'] ?? []),
        'mode' => ($session['livemode'] ?? false) ? 'live' : 'test',
    ]);
}
