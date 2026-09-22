import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FormationDetailClient from "./FormationDetailClient";
import { fetchBourseById, fetchFormationById } from "@/lib/api";

export const revalidate = 0; // Les places et statuts changent en continu

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const formation = await fetchFormationById(id);
  if (!formation) {
    return { title: "Formation introuvable — Sahel Academy" };
  }
  return {
    title: `${formation.titre} — Sahel Academy`,
    description:
      formation.description ||
      "Inscrivez-vous à cette formation sur Sahel Academy",
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

  return <FormationDetailClient formation={formation} bourseLiee={bourseLiee} />;
}
