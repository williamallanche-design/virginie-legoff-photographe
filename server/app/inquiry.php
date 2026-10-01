<?php
declare(strict_types=1);

/**
 * POST /api/inquiry : formulaire de pré-qualification (avant Calendly).
 * Le message part chez Virginie avec l'adresse du visiteur en « Répondre à ».
 * Aucun e-mail automatique n'est envoyé au visiteur : le formulaire ne peut pas servir à écrire à un tiers.
 */
function inquiry(): void
{
    Http::method('POST');
    $in = Http::body();

    // Robots : champ piège rempli, ou formulaire envoyé en moins de 3 secondes. On répond « ok » sans rien faire.
    if (trim((string) ($in['website'] ?? '')) !== '' || (int) ($in['elapsed'] ?? 0) < 3000) {
        Http::json(['ok' => true]);
    }
    if (!RateLimit::allow('inquiry', 5, 3600)) {
        Http::error('Vous avez déjà envoyé plusieurs demandes. Réessayez dans une heure ou écrivez directement par e-mail.', 429);
    }

    $types = [
        'mariage' => 'Mariage',
        'evenement-prive' => 'Événement privé',
        'entreprise' => 'Reportage d\'entreprise',
        'tirage' => 'Tirage d\'art',
        'autre' => 'Autre demande',
    ];
    $field = static fn (string $key, int $max) => mb_substr(trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', (string) ($in[$key] ?? '')) ?? ''), 0, $max);

    $name = $field('name', 120);
    $email = $field('email', 160);
    $phone = $field('phone', 30);
    $type = (string) ($in['type'] ?? '');
    $message = $field('message', 4000);
    $date = $field('eventDate', 10);
    $place = $field('place', 160);
    $guests = $field('guests', 10);

    $errors = [];
    if (mb_strlen($name) < 2) $errors[] = 'votre nom';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'une adresse e-mail valide';
    if (!isset($types[$type])) $errors[] = 'le type de demande';
    if (mb_strlen($message) < 10) $errors[] = 'un message d\'au moins quelques mots';
    if (($in['consent'] ?? '') !== '1') $errors[] = 'votre accord pour le traitement de la demande';
    if ($phone !== '' && !preg_match('/^[0-9 +().-]{6,30}$/', $phone)) $errors[] = 'un numéro de téléphone valide';
    if ($date !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) $errors[] = 'une date valide';
    if ($errors) {
        Http::error('Merci d\'indiquer ' . implode(', ', $errors) . '.', 422);
    }

    $record = compact('name', 'email', 'phone', 'type', 'date', 'place', 'guests', 'message') + ['receivedAt' => date('c')];
    Store::writeJson(Store::dir('inquiries') . '/' . date('Y-m-d-His') . '-' . bin2hex(random_bytes(3)) . '.json', $record);

    $body = implode("\n", array_filter([
        "Nouvelle demande depuis le site : {$types[$type]}",
        '',
        "Nom : $name",
        "E-mail : $email",
        $phone !== '' ? "Téléphone : $phone" : null,
        $date !== '' ? 'Date envisagée : ' . date('d/m/Y', strtotime($date)) : null,
        $place !== '' ? "Lieu : $place" : null,
        $guests !== '' ? "Invités : $guests" : null,
        '',
        $message,
        '',
        'Répondez directement à cet e-mail pour écrire à ' . $name . '.',
    ], static fn ($l) => $l !== null));

    if (!Mailer::send(Mailer::owner(), "Demande · {$types[$type]} · $name", $body, $email)) {
        Http::error('Votre message n\'a pas pu être transmis. Réessayez plus tard ou écrivez directement par e-mail.', 502);
    }
    Http::json(['ok' => true]);
}
