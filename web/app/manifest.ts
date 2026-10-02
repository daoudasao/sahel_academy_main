import type { MetadataRoute } from "next";
import { ANDROID_PACKAGE, PLAY_STORE_URL } from "@/lib/app-mobile";
import { COULEUR_MARQUE, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "fr",
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: COULEUR_MARQUE,
    related_applications: [
      { platform: "play", url: PLAY_STORE_URL, id: ANDROID_PACKAGE },
    ],
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
