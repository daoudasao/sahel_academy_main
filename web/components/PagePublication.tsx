import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { fetchPublicationById, type Publication } from "@/lib/api";
import { IMAGE_PARTAGE, resume } from "@/lib/seo";
import BoutonOuvrirApp from "@/components/BoutonOuvrirApp";

/**
 * Publication du fil d'actualité, lisible sans l'application.
 *
 * Cible des liens de partage `sahel-academy.com/app/post/:id` : quand l'app
 * Android est installée, Android ouvre le lien directement dedans (App Links) ;
 * sinon c'est cette page qui s'affiche, avec le bandeau Google Play.
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

/** Texte avec ses adresses web rendues cliquables. */
function TexteAvecLiens({ texte }: { texte: string }) {
  const morceaux = texte.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {morceaux.map((m, i) =>
        /^https?:\/\//.test(m) ? (
          <a
            key={i}
            href={m}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-emerald-700 dark:text-emerald-400 underline underline-offset-2 break-all"
          >
            {m}
          </a>
        ) : (
          m
        ),
      )}
    </>
  );
}

function initiales(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function Medias({ medias, auteur }: { medias: Publication["medias"]; auteur: string }) {
  if (medias.length === 0) return null;
  return (
    <div className="space-y-3">
      {medias.map((m) =>
        m.type === "photo" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={m.id}
            src={m.url}
            alt={m.nom || `Photo publiée par ${auteur}`}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800"
          />
        ) : m.type === "video" ? (
          <video key={m.id} src={m.url} controls preload="metadata" className="w-full rounded-2xl bg-black" />
        ) : (
          <audio key={m.id} src={m.url} controls preload="metadata" className="w-full" />
        ),
      )}
    </div>
  );
}

export default async function PagePublication({ id }: { id: string }) {
  const post = await fetchPublicationById(id);
  if (!post) notFound();

  const date = new Date(post.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const badge = post.role === "Admin" || post.role === "Formateur" ? post.role : null;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 pt-16 pb-10">
      <div className="mx-auto max-w-xl space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Sahel Academy
        </Link>

        <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <header className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0d3b32] text-sm font-extrabold text-white">
              {initiales(post.auteurNom)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-bold text-slate-900 dark:text-white">{post.auteurNom}</h1>
                {badge && (
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{date}</p>
            </div>
          </header>

          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            <TexteAvecLiens texte={post.contenu} />
          </p>

          <Medias medias={post.medias} auteur={post.auteurNom} />

          {post.documentNom && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3">
              <FileText className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <p className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold">{post.documentNom}</span>
                <span className="block text-slate-500">Document à télécharger dans l&apos;application</span>
              </p>
            </div>
          )}
        </article>

        <BoutonOuvrirApp cheminApp={`/post/${post.id}`} />
      </div>
    </main>
  );
}
