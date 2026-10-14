<?php
// Assistant de configuration du serveur : écrit vl-app/config.php à partir de quelques questions.
//
//   php ~/vl-app/tools/configure.php
//
// À relancer à tout moment pour changer une valeur : Entrée conserve la valeur actuelle.
// Les secrets (clé Stripe, mot de passe, jeton) sont saisis sans s'afficher à l'écran.
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$app = dirname(__DIR__);
$file = "$app/config.php";
$current = is_file($file) ? (require $file) : [];
$get = static function (array $a, string $path, mixed $default = null): mixed {
    foreach (explode('.', $path) as $k) {
        if (!is_array($a) || !array_key_exists($k, $a)) {
            return $default;
        }
        $a = $a[$k];
    }
    return $a;
};

$ask = static function (string $question, string $default = '', bool $secret = false): string {
    $hint = $secret ? ($default !== '' ? ' [déjà renseigné, Entrée pour garder]' : '') : ($default !== '' ? " [$default]" : '');
    fwrite(STDOUT, "$question$hint : ");
    if ($secret) {
        @shell_exec('stty -echo 2>/dev/null');
    }
    $answer = trim((string) fgets(STDIN));
    if ($secret) {
        @shell_exec('stty echo 2>/dev/null');
        fwrite(STDOUT, "\n");
    }
    return $answer === '' ? $default : $answer;
};

echo "\nConfiguration du site virginielegoff.fr\n";
echo "Entrée seule = garder la valeur proposée.\n\n";

// E-mails
$to = '';
while (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
    $to = $ask('1. Adresse où Virginie reçoit les demandes et les commandes', (string) $get($current, 'mail.to', ''));
}
$from = '';
while (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
    $from = $ask('2. Adresse d\'envoi des e-mails du site (boîte à créer dans cPanel)', (string) $get($current, 'mail.from', 'contact@virginielegoff.fr'));
}

// Stripe
echo "\n3. Clé Stripe (rk_test_…, rk_live_…, sk_test_… ou sk_live_…). Vide = boutique fermée.\n";
$stripeKey = '';
do {
    $stripeKey = $ask('   Clé', (string) $get($current, 'stripe.secret_key', ''), true);
    $valid = $stripeKey === '' || preg_match('/^(sk|rk)_(test|live)_[A-Za-z0-9]{20,}$/', $stripeKey);
    if (!$valid) {
        echo "   Format non reconnu : la clé commence par rk_ ou sk_, puis test_ ou live_.\n";
    }
} while (!$valid);
$webhookSecret = (string) $get($current, 'stripe.webhook_secret', '');
if ($stripeKey !== (string) $get($current, 'stripe.secret_key', '')) {
    $webhookSecret = ''; // nouvelle clé (ou nouveau mode) : son webhook sera recréé par stripe-setup.php
}

// Livraison
echo "\n4. Livraison (tarif unique, en France métropolitaine par défaut)\n";
$rate = $get($current, 'shipping.rates.0', ['label' => 'Colissimo suivi', 'amount_cents' => 0, 'min_days' => 5, 'max_days' => 10]);
$label = $ask('   Nom affiché', (string) $rate['label']);
$price = str_replace(',', '.', $ask('   Prix en euros (0 = offerte)', number_format($rate['amount_cents'] / 100, 2, ',', '')));
$min = (int) $ask('   Délai minimum (jours ouvrés)', (string) $rate['min_days']);
$max = (int) $ask('   Délai maximum (jours ouvrés)', (string) $rate['max_days']);
$countries = array_values(array_filter(array_map('trim', explode(',', strtoupper(
    $ask('   Pays livrés (codes séparés par des virgules)', implode(',', $get($current, 'shipping.countries', ['FR'])))
)))));

// Administration
echo "\n5. Mot de passe de l'administration (/admin/), 12 caractères minimum.\n";
$hash = (string) $get($current, 'admin.password_hash', '');
while (true) {
    $pass = $ask('   Mot de passe', $hash !== '' ? '•' : '', true);
    if ($pass === '•') {
        break; // conservé
    }
    if (mb_strlen($pass) < 12) {
        echo "   Trop court.\n";
        continue;
    }
    if ($ask('   Confirmer', '', true) !== $pass) {
        echo "   Les deux saisies diffèrent.\n";
        continue;
    }
    $hash = password_hash($pass, PASSWORD_DEFAULT);
    break;
}

// GitHub (publication depuis l'admin)
echo "\n6. Jeton GitHub pour publier depuis l'admin (facultatif, Entrée pour passer).\n";
$token = $ask('   Jeton', (string) $get($current, 'github.token', ''), true);

$config = [
    'env' => 'production',
    'site_url' => 'https://virginielegoff.fr',
    'cors_origins' => [],
    'paths' => [
        'data' => "$app/data",
        'content' => "$app/content",
        'media' => dirname($app) . '/virginielegoff.fr/media',
    ],
    'stripe' => ['secret_key' => $stripeKey, 'webhook_secret' => $webhookSecret],
    'shipping' => [
        'countries' => $countries ?: ['FR'],
        'rates' => [[
            'label' => $label,
            'amount_cents' => (int) round(((float) $price) * 100),
            'min_days' => max(1, $min),
            'max_days' => max($min, $max),
        ]],
    ],
    'mail' => ['transport' => 'mail', 'to' => $to, 'from' => $from, 'from_name' => 'Virginie Legoff'],
    'admin' => ['password_hash' => $hash, 'session_hours' => 8],
    'github' => [
        'token' => $token,
        'repo' => 'williamallanche-design/virginie-legoff-photographe',
        'branch' => 'main',
    ],
];

$php = "<?php\n// Généré par tools/configure.php le " . date('d/m/Y à H:i') . ". Relancer l'assistant pour modifier.\n"
    . "declare(strict_types=1);\n\nreturn " . var_export($config, true) . ";\n";
if (file_put_contents($file, $php, LOCK_EX) === false) {
    fwrite(STDERR, "\nÉcriture impossible : $file\n");
    exit(1);
}
chmod($file, 0600);

echo "\n✓ config.php enregistré (lisible par vous seul).\n";
if ($stripeKey !== '' && $webhookSecret === '') {
    echo "\nÉtape suivante, pour brancher le paiement :\n\n    php $app/tools/stripe-setup.php --webhook\n\n";
} else {
    echo "\nVérification du paiement : php $app/tools/stripe-setup.php\n\n";
}
