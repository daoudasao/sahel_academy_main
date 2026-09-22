import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Ancien lien de partage : on ouvre la bourse directement (voir /formation/[id]). */
export default async function BourseDeepLinkPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/bourses/${id}`);
}
