import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FormationDetailClient from "./FormationDetailClient";
import { fetchBourseById, fetchFormationById } from "@/lib/api";
import { filAriane, IMAGE_PARTAGE, jsonLd, ORGANISATION, resume, SITE_URL } from "@/lib/seo";

export const revalidate = 0; // Les places et statuts changent en continu

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const formation = await fetchFormationById(id);
  if (!formation) {
    return { title: "Formation introuvable", robots: { index: false } };
  }
  const description =
    resume(formation.description) ??
    `Inscrivez-vous à la formation ${formation.titre} sur Sahel Academy.`;
  const chemin = `/formations/${formation.id}`;
  const images = formation.imageUrl
    ? [{ url: formation.imageUrl, alt: formation.titre }]
    : [IMAGE_PARTAGE];
  return {
    title: formation.titre,
    description,
    alternates: { canonical: chemin },
    // Une formation archivée ou désactivée n'a plus sa place dans les résultats.
    ...(formation.statut !== "active" ? { robots: { index: false } } : {}),
    openGraph: {
      type: "article",
      url: chemin,
      title: formation.titre,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: formation.titre,
      description,
      images,
    },
  };
}

export default async function FormationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const formation = await fetchFormationById(id);

  if (!formation) {
    notFound();
  }

  // Interrogé avec un id de formation, l'endpoint bourses retombe sur la bourse
  // rattachée à cette formation (fallback `findFirst({ formationId })` côté
  // backend). On ne propose le raccourci « postuler » que si elle est ouverte.
  const bourse = await fetchBourseById(id);
  const bourseLiee = bourse && bourse.statut === "ouverte" ? bourse : null;

  const chemin = `/formations/${formation.id}`;
  // Données structurées « Course » : organisme, durée et frais d'inscription
  // (les mêmes que ceux affichés sur la fiche).
  const cours = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${SITE_URL}${chemin}#cours`,
    name: formation.titre,
    description:
      resume(formation.description, 500) ?? `Formation ${formation.titre} — Sahel Academy`,
    url: `${SITE_URL}${chemin}`,
    inLanguage: "fr",
    provider: ORGANISATION,
    ...(formation.imageUrl ? { image: formation.imageUrl } : {}),
    ...(formation.niveau ? { educationalLevel: formation.niveau } : {}),
    ...(formation.departement?.nom ? { about: formation.departement.nom } : {}),
    ...(formation.dureeMois > 0 ? { timeRequired: `P${formation.dureeMois}M` } : {}),
    offers: {
      "@type": "Offer",
      category: formation.prixInscription > 0 ? "Paid" : "Free",
      price: Math.max(0, formation.prixInscription || 0),
      priceCurrency: "XOF",
      url: `${SITE_URL}${chemin}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            cours,
            filAriane([
              { nom: "Accueil", chemin: "/" },
              { nom: formation.titre, chemin },
            ]),
          ]),
        }}
      />
      <FormationDetailClient formation={formation} bourseLiee={bourseLiee} />
    </>
  );
}
