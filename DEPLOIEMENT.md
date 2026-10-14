# Mise en ligne sur O2switch

Le site est un export statique Next.js (`/out`) servi par Apache, complété par des scripts PHP
rangés **hors** de la racine web. Aucune base de données.

`virginielegoff.fr` est un **domaine ajouté** au compte cPanel : sa racine web est le dossier
`~/virginielegoff.fr/`, **pas** `public_html` (qui sert le site principal du compte, à ne pas toucher).
Vérifiable dans cPanel → Domaines → colonne « Racine du document ».

```
/home/<compte>/
├─ public_html/                 ← site principal du compte : NE RIEN Y DÉPOSER
├─ virginielegoff.fr/           ← racine web du site (contenu de out/)
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
3. **SSL/TLS Status** : lancer AutoSSL sur `virginielegoff.fr` et `www.virginielegoff.fr`
   (le `www` est redirigé vers `https://virginielegoff.fr` par le `.htaccess`).
4. **Email Deliverability** : vérifier que SPF et DKIM sont « valides » pour l'adresse d'envoi
   (`mail.from` dans config.php). Sans cela, les notifications finissent en indésirables.

## 2. Code serveur et configuration

1. Créer le dossier `~/vl-app/` (au même niveau que `virginielegoff.fr/`, dans le dossier personnel).
2. Lancer l'assistant (Terminal cPanel) : `php ~/vl-app/tools/configure.php`. Il pose les questions
   (e-mails, clé Stripe, livraison, mot de passe admin) et écrit `config.php` en 600. Ou, à la main,
   copier `server/config.example.php` en `~/vl-app/config.php` et le compléter :
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
| Variable | `SITE_URL`     | facultative : `https://virginielegoff.fr` par défaut        |
| Variable | `FTP_SITE_DIR` | facultative : `virginielegoff.fr/` par défaut               |

Chaque push sur `main` reconstruit et déploie le site (2 à 3 minutes). Lancement manuel :
onglet Actions → « Déploiement O2switch » → *Run workflow*.

Le compte FTP doit avoir pour racine le dossier personnel (`/home/<compte>/`) pour atteindre à la fois
`virginielegoff.fr/` et `vl-app/`.

## 4. Photos et séquence du hero (une seule fois)

Ces fichiers ne sont pas versionnés (plus de 130 Mo). Les envoyer avec FileZilla en FTPS :

- `public/media/` → `~/virginielegoff.fr/media/`
- `public/hero/desktop/` et `public/hero/mobile/` → `~/virginielegoff.fr/hero/…`

Plus simple pour le premier envoi : `deploy/site.zip` (site complet, photos comprises) à extraire
dans `~/virginielegoff.fr/`, et `deploy/vl-app.zip` à extraire dans `~/vl-app/`.

Ensuite, les nouvelles photos arrivent par l'administration (`/admin/`), qui génère elle-même
les variantes WebP et la version filigranée directement sur le serveur.

## 5. Stripe

Le site encaisse sur le compte Stripe dont la clé figure dans `config.php`. Pour Virginie : son
propre compte, à son nom et avec son RIB. Aucune ligne de code à modifier pour le brancher.

**Une fois : créer et activer le compte (Virginie)**
1. Créer le compte sur stripe.com, puis *Activer les paiements* : identité, statut (SIRET),
   RIB pour les virements. Tant que ce n'est pas fait, seul le mode test fonctionne.
2. Paramètres → *Informations publiques* : nom affiché « Virginie Legoff », e-mail et
   téléphone du service client, adresse `https://virginielegoff.fr` (visibles sur le reçu).
3. Paramètres → *E-mails clients* : activer « Paiements réussis » (reçu envoyé par Stripe).
4. Paramètres → *Moyens de paiement* : laisser carte, Apple Pay, Google Pay, Link ; ils
   apparaissent automatiquement dans la page de paiement.

**Brancher le compte sur le site**
1. Développeurs → Clés API → *Créer une clé restreinte* (plus sûre qu'une clé secrète) :
   - Checkout Sessions : **Écriture**
   - Products : **Lecture** (le webhook y lit le support et le format de chaque tirage)
   - Webhook Endpoints : **Écriture** (sert uniquement à la mise en service)
   - Tout le reste : Aucun accès (lecture du compte facultative, pour le diagnostic)
2. Coller la clé dans `vl-app/config.php` → `stripe.secret_key`.
3. Sur le serveur (Terminal cPanel) :
   ```bash
   php ~/vl-app/tools/stripe-setup.php --webhook
   ```
   Le script vérifie le compte et le mode (test ou réel), crée le webhook
   `https://virginielegoff.fr/api/stripe-webhook` avec les bons événements et la version d'API
   figée, puis affiche la clé de signature `whsec_…` à coller dans `stripe.webhook_secret`.
4. Relancer `php ~/vl-app/tools/stripe-setup.php` : il doit conclure « Prêt à encaisser ».

**Tester puis ouvrir**
- Faire d'abord tout le parcours avec la clé de test (`rk_test_…`) : le panier affiche « Mode test »,
  carte `4242 4242 4242 4242`, date future, code quelconque. Vérifier les deux e-mails et
  `~/vl-app/data/orders/cs_test_….json`.
- Puis refaire les étapes « Brancher » avec la clé réelle (`rk_live_…`). Le webhook de test et
  celui du mode réel sont distincts : relancer le script avec `--webhook` après le changement de clé.

Sans clé, la boutique reste en consultation : le panier invite à écrire à Virginie.

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
cp .env.example .env.development.local
npm run dev                         # http://localhost:3000
npm run php                         # API PHP sur http://localhost:8000 (php dans le PATH)
npm run import                      # régénère public/media depuis les photos sources
.\scripts\make-hero-placeholder.ps1 # séquence provisoire du hero
.\scripts\extract-hero-frames.ps1 -Video kling.mp4   # séquence définitive
```

Configuration PHP locale : `server/config.php` (non versionné, `env: development`,
e-mails écrits dans `server/data/logs/mail.log`).
