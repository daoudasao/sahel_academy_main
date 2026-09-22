import { notFound } from "next/navigation";
import type { Metadata } from "next";
import VerifForm from "@/components/VerifForm";
import { FORMATIONS, estSlugValide } from "@/lib/formations";

export function generateStaticParams() {
  return Object.keys(FORMATIONS).map((bourse) => ({ bourse }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bourse: string }>;
}): Promise<Metadata> {
  const { bourse } = await params;
  if (!estSlugValide(bourse)) return { title: "Sahel Academy" };
  const f = FORMATIONS[bourse];
  return {
    title: `Sahel Academy — Bourse ${f.titre}`,
    description: f.sousTitre,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ bourse: string }>;
}) {
  const { bourse } = await params;
  if (!estSlugValide(bourse)) notFound();
  const f = FORMATIONS[bourse];
  return (
    <VerifForm formation={f.formation} titre={f.titre} sousTitre={f.sousTitre} />
  );
}
