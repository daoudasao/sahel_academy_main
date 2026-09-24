import { notFound } from "next/navigation";
import type { Metadata } from "next";
import VerifForm from "@/components/VerifForm";
import { FORMATIONS, estSlugValide } from "@/lib/formations";
import { IMAGE_PARTAGE } from "@/lib/seo";

export function generateStaticParams() {
  return Object.keys(FORMATIONS).map((bourse) => ({ bourse }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bourse: string }>;
}): Promise<Metadata> {
  const { bourse } = await params;
  if (!estSlugValide(bourse)) return { robots: { index: false } };
  const f = FORMATIONS[bourse];
  const titre = `Statut de candidature — ${f.titre}`;
  return {
    title: titre,
    description: f.sousTitre,
    alternates: { canonical: `/${bourse}` },
    openGraph: {
      url: `/${bourse}`,
      title: titre,
      description: f.sousTitre,
      images: [IMAGE_PARTAGE],
    },
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
