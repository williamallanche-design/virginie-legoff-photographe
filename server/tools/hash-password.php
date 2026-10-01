<?php
// Génère le hachage du mot de passe d'administration à coller dans config.php.
//   php vl-app/tools/hash-password.php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

fwrite(STDOUT, 'Mot de passe (12 caractères minimum) : ');
$password = trim((string) fgets(STDIN));
if (mb_strlen($password) < 12) {
    fwrite(STDERR, "Trop court : 12 caractères minimum.\n");
    exit(1);
}
fwrite(STDOUT, "\n'password_hash' => '" . password_hash($password, PASSWORD_DEFAULT) . "',\n");
