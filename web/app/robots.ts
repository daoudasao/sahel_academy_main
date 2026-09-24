import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Les pages personnelles (connexion, candidatures…) restent explorables : elles
// portent elles-mêmes « noindex », que Google ne verrait pas s'il était bloqué ici.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
