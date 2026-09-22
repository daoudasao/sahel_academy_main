import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autonome pour Docker : Next produit `.next/standalone` avec un
  // serveur Node minimal et seulement les dépendances réellement utilisées.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          {
            key: "Content-Type",
            value: "application/json",
          },
        ],
      },
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/json",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
