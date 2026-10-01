<?php
declare(strict_types=1);

/**
 * /api/admin/<action> : gestion du catalogue par Virginie.
 *
 *   GET  session   état de la session (+ jeton CSRF)
 *   POST login     { password }
 *   POST logout
 *   GET  catalog   brouillon courant + indicateur « non publié »
 *   POST save      { catalog }  enregistre le brouillon (champs éditables uniquement)
 *   POST upload    multipart : file, series  → traite l'image, l'ajoute au brouillon
 *   POST publish   commit du brouillon sur GitHub → déploiement automatique
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
            $draft = Catalog::draft();
            Http::json(['catalog' => $draft, 'unpublished' => $draft != Catalog::published()]);

        case 'save':
            Http::method('POST');
            Auth::require();
            $incoming = Http::body()['catalog'] ?? null;
            if (!is_array($incoming)) {
                Http::error('Catalogue manquant.', 422);
            }
            $merged = Catalog::mergeEdits(Catalog::draft(), $incoming);
            Catalog::saveDraft($merged);
            Http::json(['ok' => true, 'photos' => count($merged['photos'])]);

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
            $json = json_encode($draft, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";

            $commit = null;
            if (GitHub::configured()) {
                $commit = GitHub::putFile('content/catalog.json', $json, 'Catalogue : mise à jour depuis l\'administration');
            }
            // Copie locale immédiate : le paiement connaît les nouvelles photos sans attendre le déploiement.
            Store::writeAtomic(Catalog::publishedFile(), $json);

            $kept = array_column($draft['photos'], 'slug');
            foreach (array_column($previous['photos'], 'slug') as $slug) {
                if (!in_array($slug, $kept, true)) {
                    Images::trash($slug);
                }
            }
            Store::log('admin.log', 'Publication ' . ($commit ?: '(sans GitHub)'));
            Http::json(['ok' => true, 'commit' => $commit, 'deployed' => $commit !== null]);
    }

    Http::error('Action inconnue.', 404);
}
