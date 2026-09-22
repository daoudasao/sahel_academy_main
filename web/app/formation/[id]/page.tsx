import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Ancien lien de partage. Il affichait un écran intermédiaire « Ouvrir dans
 * l'application / Continuer sur le site » avant tout contenu ; on envoie
 * directement sur la fiche, le téléchargement de l'app étant proposé une fois
 * la demande envoyée.
 */
export default async function FormationDeepLinkPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/formations/${id}`);
}
