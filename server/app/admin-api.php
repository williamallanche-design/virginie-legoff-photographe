<?php
declare(strict_types=1);

/**
 * /api/admin/<action> : gestion du catalogue et des tarifs par Virginie.
 *
 *   GET  session   état de la session (+ jeton CSRF)
 *   POST login     { password }
 *   POST logout
 *   GET  catalog   brouillons courants (photos et tarifs) + indicateur « non publié »
 *   POST save      { catalog?, prints? }  enregistre les brouillons (champs éditables uniquement)
 *   POST upload    multipart : file, series  → traite l'image, l'ajoute au brouillon
 *   POST publish   commit des brouillons sur GitHub → déploiement automatique
 */
function admin_api(string $action): void
{
    Auth::start();

    switch ($action) {
        case 'session':
            Http::method('GET');
            Http::json(['authenticated' => Auth::check(), 'csrf' => Auth::csrf()]);

        case 'login':
            Http::method('POST');
            if (!RateLimit::allow('login', 5, 900)) {
                Http::error('Trop de tentatives. Réessayez dans 15 minutes.', 429);
            }
            $password = Http::body()['password'] ?? '';
            if (!is_string($password) || !Auth::login($password)) {
                Store::log('admin.log', 'Échec de connexion depuis ' . Http::ip());
                Http::error('Mot de passe incorrect.', 401);
            }
            Store::log('admin.log', 'Connexion depuis ' . Http::ip());
            Http::json(['authenticated' => true, 'csrf' => Auth::csrf()]);

        case 'logout':
            Http::method('POST');
            Auth::require();
            Auth::logout();
            Http::json(['authenticated' => false]);

        case 'catalog':
            Http::method('GET');
            Auth::require();
            Http::json(['catalog' => Catalog::draft(), 'prints' => Catalog::printsDraft(), 'unpublished' => admin_unpublished()]);

        case 'save':
            Http::method('POST');
            Auth::require();
            $body = Http::body();
            if (!is_array($body['catalog'] ?? null) && !is_array($body['prints'] ?? null)) {
                Http::error('Rien à enregistrer.', 422);
            }
            if (is_array($body['catalog'] ?? null)) {
                Catalog::saveDraft(Catalog::mergeEdits(Catalog::draft(), $body['catalog']));
            }
            if (is_array($body['prints'] ?? null)) {
                Catalog::savePrintsDraft(Catalog::mergePrices(Catalog::prints(), $body['prints']));
            }
            Http::json(['ok' => true, 'unpublished' => admin_unpublished()]);

        case 'upload':
            Http::method('POST');
            Auth::require();
            $draft = Catalog::draft();
            $series = (string) ($_POST['series'] ?? '');
            if (!in_array($series, array_column($draft['series'], 'slug'), true)) {
                Http::error('Série inconnue.', 422);
            }
            // Les slugs de la corbeille et du catalogue publié restent réservés : pas de collision de fichiers.
            $used = array_merge(array_column($draft['photos'], 'slug'), array_column(Catalog::published()['photos'], 'slug'));
            $photo = Images::ingest($_FILES['file'] ?? [], $series, $used);
            $inSeries = array_filter($draft['photos'], static fn ($p) => $p['series'] === $series);
            $photo['order'] = $inSeries ? max(array_column($inSeries, 'order')) + 1 : 1;
            $draft['photos'][] = $photo;
            Catalog::saveDraft($draft);
            Store::log('admin.log', "Ajout de {$photo['slug']} dans $series");
            Http::json(['photo' => $photo]);

        case 'publish':
            Http::method('POST');
            Auth::require();
            $draft = Catalog::draft();
            $previous = Catalog::published();
            $prints = Catalog::printsDraft();
            if ($errors = Catalog::printsErrors($prints)) {
                Http::error('Tarifs incomplets : ' . implode(' ', array_slice($errors, 0, 3)) . (count($errors) > 3 ? ' …' : ''), 422);
            }

            // Seuls les fichiers modifiés partent sur GitHub, en un seul commit.
            $files = [];
            $changes = [];
            if ($draft != $previous) {
                $files['content/catalog.json'] = admin_json($draft);
                $changes[] = 'catalogue';
            }
            if ($prints != Catalog::prints()) {
                $files['content/prints.json'] = admin_json($prints);
                $changes[] = 'tarifs';
            }
            // Sans GitHub, le site ne serait pas reconstruit : le prix encaissé différerait du prix affiché.
            if (isset($files['content/prints.json']) && !GitHub::configured()) {
                Http::error('Les tarifs ne peuvent pas encore être publiés : la mise à jour automatique du site (jeton GitHub) n\'est pas configurée.', 409);
            }
            if (!$files) {
                Http::json(['ok' => true, 'commit' => null, 'deployed' => false]);
            }

            $commit = null;
            if (GitHub::configured()) {
                $commit = GitHub::commitFiles($files, ucfirst(implode(' et ', $changes)) . ' : mise à jour depuis l\'administration');
            }
            // Copies locales immédiates : le paiement connaît les nouvelles photos et les nouveaux prix sans attendre le déploiement.
            if (isset($files['content/catalog.json'])) {
                Store::writeAtomic(Catalog::publishedFile(), $files['content/catalog.json']);
            }
            if (isset($files['content/prints.json'])) {
                Store::writeAtomic(Catalog::printsFile(), $files['content/prints.json']);
            }

            $kept = array_column($draft['photos'], 'slug');
            foreach (array_column($previous['photos'], 'slug') as $slug) {
                if (!in_array($slug, $kept, true)) {
                    Images::trash($slug);
                }
            }
            Store::log('admin.log', 'Publication (' . implode(', ', $changes) . ') ' . ($commit ?: '(sans GitHub)'));
            Http::json(['ok' => true, 'commit' => $commit, 'deployed' => $commit !== null]);
    }

    Http::error('Action inconnue.', 404);
}

function admin_unpublished(): bool
{
    return Catalog::draft() != Catalog::published() || Catalog::printsDraft() != Catalog::prints();
}

function admin_json(array $data): string
{
    return json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
}
