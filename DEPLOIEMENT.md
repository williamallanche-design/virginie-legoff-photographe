# Mise en ligne sur O2switch

Le site est un export statique Next.js (`/out`) servi par Apache, complété par des scripts PHP
rangés **hors** de `public_html`. Aucune base de données.

```
/home/<compte>/
├─ public_html/                 ← déployé par GitHub Actions (contenu de out/)
│  ├─ .htaccess                 ← HTTPS, en-têtes de sécurité, cache, anti-hotlink
│  ├─ api/index.php + .htaccess ← seul PHP exposé : il charge ~/vl-app
│  ├─ media/<photo>/…           ← envoyé une fois à la main, puis alimenté par l'admin
│  └─ hero/desktop|mobile/…     ← séquence du hero, envoyée à la main
└─ vl-app/                      ← déployé par GitHub Actions (sauf config.php et data/)
   ├─ bootstrap.php, app/, lib/, assets/, tools/
   ├─ content/catalog.json, prints.json   ← version publiée
   ├─ config.php                ← secrets, créé à la main, jamais versionné
   └─ data/                     ← créé automatiquement : brouillon, commandes, demandes,
                                   sessions, originaux, corbeille, journaux
```

## 1. cPanel O2switch

1. **Sélectionner la version de PHP** : PHP 8.3 ou plus récent. Extensions à cocher :
   `gd`, `curl`, `fileinfo`, `mbstring`, `exif`, `intl`.
2. **MultiPHP INI Editor** (sur le domaine) :
   `upload_max_filesize = 40M`, `post_max_size = 42M`, `memory_limit = 1024M`, `max_execution_time = 180`.
3. **SSL/TLS Status** : lancer AutoSSL sur le domaine et le `www`.
4. **Email Deliverability** : vérifier que SPF et DKIM sont « valides » pour l'adresse d'envoi
   (`mail.from` dans config.php). Sans cela, les notifications finissent en indésirables.

## 2. Code serveur et configuration

1. Créer le dossier `~/vl-app/` (même niveau que `public_html`).
2. Copier `server/config.example.php` en `~/vl-app/config.php` et le compléter :
   `site_url`, adresses e-mail, livraison, clés Stripe, jeton GitHub.
3. Mot de passe d'administration (Terminal cPanel ou SSH) :
   ```bash
   php ~/vl-app/tools/hash-password.php
   ```
   puis coller la ligne obtenue dans `config.php`.
4. Droits : `chmod 600 ~/vl-app/config.php`.

## 3. GitHub Actions

Dépôt → Settings → Secrets and variables → Actions :

| Type     | Nom            | Valeur                                                      |
| -------- | -------------- | ----------------------------------------------------------- |
| Secret   | `FTP_HOST`     | serveur FTP O2switch (nom d'hôte du compte, voir cPanel)    |
| Secret   | `FTP_USER`     | identifiant cPanel (compte FTP principal, racine = home)    |
| Secret   | `FTP_PASSWORD` | mot de passe du compte FTP                                  |
| Variable | `SITE_URL`     | `https://www.domaine.fr` (sans barre finale)                |

Chaque push sur `main` reconstruit et déploie le site (2 à 3 minutes). Lancement manuel :
onglet Actions → « Déploiement O2switch » → *Run workflow*.

Le compte FTP doit avoir pour racine le dossier personnel (`/home/<compte>/`) pour atteindre à la fois
`public_html/` et `vl-app/`.

## 4. Photos et séquence du hero (une seule fois)

Ces fichiers ne sont pas versionnés (plus de 130 Mo). Les envoyer avec FileZilla en FTPS :

- `public/media/` → `public_html/media/`
- `public/hero/desktop/` et `public/hero/mobile/` → `public_html/hero/…`

Ensuite, les nouvelles photos arrivent par l'administration (`/admin/`), qui génère elle-même
les variantes WebP et la version filigranée directement sur le serveur.

## 5. Stripe

1. Dashboard → Développeurs → Clés API : copier la clé secrète (`sk_test_…` pour les essais,
   `sk_live_…` en production) dans `config.php`.
2. Dashboard → Webhooks → *Ajouter un point de terminaison* :
   - URL : `https://www.domaine.fr/api/stripe-webhook`
   - Événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   - Copier la *clé secrète de signature* (`whsec_…`) dans `config.php`.
3. Paramètres → E-mails clients : activer « Paiements réussis » pour le reçu Stripe.
4. Test : commander avec la carte `4242 4242 4242 4242` en mode test, vérifier la réception des
   deux e-mails et la présence de `~/vl-app/data/orders/cs_test_….json`.

## 6. Publication depuis l'administration

`/admin/` → modifications enregistrées en brouillon (`data/catalog.draft.json`) → bouton
**Publier** : `content/catalog.json` est commité sur GitHub via l'API, ce qui déclenche le déploiement.

Jeton GitHub : Settings → Developer settings → *Fine-grained tokens* → dépôt unique
`virginie-legoff-photographe`, permission **Contents : Read and write**, expiration d'un an
(à renouveler). Sans jeton, « Publier » met seulement à jour la copie serveur (le paiement voit
les nouvelles photos, mais pas les pages du site).

Les photos supprimées sont déplacées dans `~/vl-app/data/trash/<date>/`, jamais effacées.

## 7. Calendly

Renseigner `calendlyUrl` dans `content/site.json` (ex. `https://calendly.com/virginie-legoff/decouverte`),
puis pousser. Le calendrier n'apparaît qu'après l'envoi du formulaire, avec le rappel de
l'échange préalable par e-mail.

## Développement local

```bash
npm install
cp .env.example .env.local
npm run dev                         # http://localhost:3000
npm run php                         # API PHP sur http://localhost:8000 (php dans le PATH)
npm run import                      # régénère public/media depuis les photos sources
.\scripts\make-hero-placeholder.ps1 # séquence provisoire du hero
.\scripts\extract-hero-frames.ps1 -Video kling.mp4   # séquence définitive
```

Configuration PHP locale : `server/config.php` (non versionné, `env: development`,
e-mails écrits dans `server/data/logs/mail.log`).
