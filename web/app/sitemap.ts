import type { MetadataRoute } from "next";
import { fetchBourses, fetchFormations } from "@/lib/api";
import { FORMATIONS } from "@/lib/formations";
import { SITE_URL } from "@/lib/seo";

// Construit à chaque demande : les bourses et formations changent souvent, et
// l'API n'est pas joignable pendant le build de l'image Docker.
export const dynamic = "force-dynamic";

function date(valeur: string | null | undefined): Date | undefined {
  if (!valeur) return undefined;
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Uniquement ce que l'API publie : bourses ouvertes, formations actives.
  const [bourses, formations] = await Promise.all([fetchBourses(), fetchFormations()]);

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    ...bourses.map((b) => ({
      url: `${SITE_URL}/bourses/${b.id}`,
      lastModified: date(b.datePublication),
      changeFrequency: "weekly" as const,
      priority: 0.9,
      ...(b.imageUrl ? { images: [b.imageUrl] } : {}),
    })),
    ...formations.map((f) => ({
      url: `${SITE_URL}/formations/${f.id}`,
      lastModified: date(f.datePublication),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(f.imageUrl ? { images: [f.imageUrl] } : {}),
    })),
    ...Object.keys(FORMATIONS).map((slug) => ({
      url: `${SITE_URL}/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
