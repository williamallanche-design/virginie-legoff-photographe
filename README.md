# Virginie Legoff · Photographe

Site vitrine et boutique de tirages d'art. Next.js en export statique, scripts PHP hors `public_html`, hébergement O2switch.

## Développement

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # génère le site statique dans /out
```

## Organisation

- `src/app` : pages (export statique, `trailingSlash: true`)
- `src/app/globals.css` : tokens de la charte « Estran » (humeurs Papier / Nuit via `data-mood`)
- `content/` : catalogue et grille tarifaire en JSON, lus au build et par le PHP
- `server/` : scripts PHP (Stripe, admin, contact), déployés hors `public_html`
- `public/media/` : variantes WebP générées, non versionnées
