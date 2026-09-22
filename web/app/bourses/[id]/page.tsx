import BourseDetailClient from "./BourseDetailClient";
import { fetchBourseById } from "@/lib/api";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

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
    return { title: "Bourse introuvable — Sahel Academy" };
  }
  return {
    title: `Bourse ${bourse.titre} — Sahel Academy`,
    description: bourse.description || "Postulez à cette bourse sur Sahel Academy",
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

  return <BourseDetailClient bourse={bourse} />;
}
