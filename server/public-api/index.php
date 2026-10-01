<?php
// Seul fichier PHP exposé dans public_html/api/. Tout le code et les secrets vivent
// dans ~/vl-app/, hors de la racine web : ils ne peuvent pas être appelés directement.
declare(strict_types=1);

$app = getenv('VL_APP_DIR') ?: dirname(__DIR__, 2) . '/vl-app';
require $app . '/bootstrap.php';

vl_route((string) ($_GET['route'] ?? ''));
