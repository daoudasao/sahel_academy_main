import type { Metadata } from "next";
import { fetchBourses, fetchFormations } from "@/lib/api";
import { jsonLd, ORGANISATION, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import HomePageClient from "./HomePageClient";

export const revalidate = 0; // Dynamic fetch

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Données structurées : l'organisme et le site (nom affiché par Google).
const donneesStructurees = {
  "@context": "https://schema.org",
  "@graph": [
    { ...ORGANISATION, description: SITE_DESCRIPTION },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#site`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: "fr",
      publisher: { "@id": ORGANISATION["@id"] },
    },
  ],
};

export default async function Home() {
  const [bourses, formations] = await Promise.all([
    fetchBourses(),
    fetchFormations(),
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(donneesStructurees) }}
      />
      <HomePageClient initialBourses={bourses} initialFormations={formations} />
    </>
  );
}
