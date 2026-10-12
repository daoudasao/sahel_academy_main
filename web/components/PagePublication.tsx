import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicationById } from "@/lib/api";
import { IMAGE_PARTAGE, resume } from "@/lib/seo";
import PublicationClient from "@/components/PublicationClient";

/**
 * Publication du fil d'actualité.
 *
 * Cible des liens de partage `sahel-academy.com/app/post/:id` : quand l'app
 * Android est installée, Android ouvre le lien directement dedans (App Links) ;
 * sinon c'est cette page qui s'affiche.
 * L'accès à la publication nécessite une connexion.
 */

/** Adresse de référence d'une publication (celle que partage l'application). */
const chemin = (id: string) => `/app/post/${id}`;

export async function metadataPublication(id: string): Promise<Metadata> {
  const post = await fetchPublicationById(id);
  if (!post) return { title: "Publication introuvable", robots: { index: false } };
  const titre = `Publication de ${post.auteurNom}`;
  const description = resume(post.contenu) ?? "Publication sur Sahel Academy.";
  const photo = post.medias.find((m) => m.type === "photo");
  const images = photo ? [{ url: photo.url, alt: titre }] : [IMAGE_PARTAGE];
  return {
    title: titre,
    description,
    alternates: { canonical: chemin(post.id) },
    openGraph: { type: "article", url: chemin(post.id), title: titre, description, images },
    twitter: { card: "summary_large_image", title: titre, description, images },
  };
}

export default async function PagePublication({
  id,
  returnUrl,
}: {
  id: string;
  returnUrl?: string;
}) {
  const post = await fetchPublicationById(id);
  if (!post) notFound();

  return (
    <PublicationClient
      post={post}
      returnUrl={returnUrl ?? chemin(post.id)}
    />
  );
}
