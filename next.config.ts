import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Site 100 % statique : `next build` produit /out, déployé tel quel dans public_html (O2switch).
  output: "export",

  // /galeries → /galeries/index.html : servi nativement par Apache, sans règle de réécriture.
  trailingSlash: true,

  // Pas d'optimiseur d'images au runtime : les variantes WebP sont générées à l'import
  // (script local ou admin PHP) et le loader choisit la bonne largeur.
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [480, 960, 1600],
    imageSizes: [240],
  },
};

export default nextConfig;
