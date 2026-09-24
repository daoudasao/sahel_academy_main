import BourseDetailClient from "./BourseDetailClient";
import { fetchBourseById } from "@/lib/api";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { filAriane, IMAGE_PARTAGE, jsonLd, resume } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const bourse = await fetchBourseById(id);
  if (!bourse) {
    return { title: "Bourse introuvable", robots: { index: false } };
  }
  const titre = `Bourse ${bourse.titre}`;
  const description =
    resume(bourse.description) ??
    `Postulez à la bourse ${bourse.titre} sur Sahel Academy.`;
  const chemin = `/bourses/${bourse.id}`;
  const images = bourse.imageUrl
    ? [{ url: bourse.imageUrl, alt: bourse.titre }]
    : [IMAGE_PARTAGE];
  return {
    title: titre,
    description,
    alternates: { canonical: chemin },
    openGraph: {
      type: "article",
      url: chemin,
      title: titre,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: titre,
      description,
      images,
    },
  };
}

export default async function BourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bourse = await fetchBourseById(id);

  if (!bourse) {
    notFound();
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            filAriane([
              { nom: "Accueil", chemin: "/" },
              { nom: `Bourse ${bourse.titre}`, chemin: `/bourses/${bourse.id}` },
            ]),
          ),
        }}
      />
      <BourseDetailClient bourse={bourse} />
    </>
  );
}
