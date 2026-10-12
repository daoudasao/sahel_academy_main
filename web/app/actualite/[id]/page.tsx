import type { Metadata } from "next";
import PagePublication, { metadataPublication } from "@/components/PagePublication";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return metadataPublication((await params).id);
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <PagePublication id={id} returnUrl={`/actualite/${id}`} />;
}
