<?php
declare(strict_types=1);

/**
 * Envoi d'e-mails texte via mail() (opérationnel sur O2switch une fois SPF/DKIM actifs dans cPanel).
 * En développement, transport « log » : les messages sont écrits dans data/logs/mail.log.
 */
final class Mailer
{
    public static function send(string $to, string $subject, string $body, ?string $replyTo = null): bool
    {
        $cfg = vl_config()['mail'];
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        // Aucun retour à la ligne dans les en-têtes : pas d'injection d'en-têtes possible.
        $subject = trim(preg_replace('/[\r\n]+/', ' ', $subject) ?? '');

        if (($cfg['transport'] ?? 'mail') === 'log') {
            Store::log('mail.log', "À: $to | Répondre à: " . ($replyTo ?? '-') . " | $subject\n$body\n" . str_repeat('-', 60));
            return true;
        }

        $headers = [
            'From' => mb_encode_mimeheader($cfg['from_name'], 'UTF-8') . ' <' . $cfg['from'] . '>',
            'MIME-Version' => '1.0',
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Content-Transfer-Encoding' => '8bit',
        ];
        if ($replyTo !== null && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $headers['Reply-To'] = $replyTo;
        }

        $ok = mail($to, mb_encode_mimeheader($subject, 'UTF-8'), $body, $headers, '-f' . $cfg['from']);
        if (!$ok) {
            Store::log('errors.log', "Échec d'envoi d'e-mail à $to : $subject");
        }
        return $ok;
    }

    public static function owner(): string
    {
        return vl_config()['mail']['to'];
    }
}
