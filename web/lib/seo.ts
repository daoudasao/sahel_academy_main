// Référencement : adresse publique du site et utilitaires partagés
// (métadonnées, sitemap, données structurées JSON-LD).

/** Adresse canonique du site (sans « www », sans « / » final). */
export const SITE_URL = (process.env.SITE_URL || "https://sahel-academy.com").replace(
  /\/+$/,
  "",
);

export const SITE_NAME = "Sahel Academy";

export const SITE_TITLE = "Sahel Academy — Bourses d'études et formations certifiantes";

export const SITE_DESCRIPTION =
  "Sahel Academy : postulez aux bourses d'études, inscrivez-vous aux formations certifiantes et suivez vos candidatures en ligne.";

/**
 * Image de partage par défaut (app/opengraph-image.png). À reprendre quand une
 * page redéfinit `openGraph` : ses images ne sont alors plus héritées.
 */
export const IMAGE_PARTAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "Sahel Academy — bourses d'études et formations certifiantes",
};

/** Couleur principale de la marque (vert du logo). */
export const COULEUR_MARQUE = "#0d3b32";

/**
 * Texte court pour une balise description : sans HTML ni sauts de ligne,
 * coupé proprement à `max` caractères.
 */
export function resume(texte: string | null | undefined, max = 160): string | undefined {
  if (!texte) return undefined;
  const propre = texte
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_#>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!propre) return undefined;
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max - 1);
  const dernierEspace = coupe.lastIndexOf(" ");
  return `${(dernierEspace > max * 0.6 ? coupe.slice(0, dernierEspace) : coupe).trimEnd()}…`;
}

/**
 * Sérialise des données structurées pour une balise
 * <script type="application/ld+json">. Le « < » est échappé pour qu'un texte
 * saisi dans le back-office ne puisse pas refermer la balise.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Fil d'Ariane (BreadcrumbList) pour les résultats de recherche. */
export function filAriane(elements: { nom: string; chemin: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: elements.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.nom,
      item: `${SITE_URL}${e.chemin}`,
    })),
  };
}

/** L'organisme, tel que décrit dans les données structurées. */
export const ORGANISATION = {
  "@type": "EducationalOrganization",
  "@id": `${SITE_URL}/#organisation`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo_large_green.png`,
} as const;
