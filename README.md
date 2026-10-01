# Virginie Legoff · Photographe

Site vitrine et boutique de tirages d'art. Next.js en export statique, scripts PHP hors
`public_html`, hébergement O2switch, zéro base de données. Mise en ligne : [DEPLOIEMENT.md](DEPLOIEMENT.md).

## Développement

```bash
npm install
cp .env.example .env.development.local
npm run dev      # site : http://localhost:3000
npm run php      # API PHP : http://localhost:8000 (formulaire, panier, admin)
npm run build    # site statique dans /out
```

## Organisation

| Dossier | Rôle |
| --- | --- |
| `src/app/(site)` | pages publiques : accueil, galeries, œuvres, tirages, mariages, contact, panier, pages légales |
| `src/app/admin` | administration (client) qui dialogue avec `server/app/admin-api.php` |
| `src/components` | hero scrollé sur canvas, Wave Gallery, Liquid Carousel, lightbox filigranée, boutique |
| `src/app/globals.css` | tokens de la charte « Estran » (humeurs Papier / Nuit via `data-mood`) |
| `content/` | catalogue, tarifs, séquence du hero et réglages du site, en JSON |
| `server/` | PHP : paiement Stripe, webhook, formulaire, administration, traitement d'images |
| `scripts/` | import des photos (sharp) et découpe vidéo du hero (ffmpeg) |

## Règles à connaître

- **Prix** : seule source `content/prints.json`, relue par le PHP au paiement (le navigateur n'envoie jamais de montant).
- **Formats proposés** : un format n'est vendu que si la photo atteint 180 dpi sans recadrage (`minDpi`).
- **Filigrane** : uniquement sur `lightbox.webp` (2400 px), incrusté au serveur. Les galeries utilisent des versions ≤ 1600 px sans filigrane.
- **Charte** : pas d'angles arrondis, d'ombres ni de flou dans le thème Tailwind ; ces utilitaires n'existent pas.
