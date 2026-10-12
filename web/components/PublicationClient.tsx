"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Lock,
  LogIn,
  UserPlus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { type Publication } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import BoutonOuvrirApp from "@/components/BoutonOuvrirApp";
import { CandidateAuthPanel } from "@/components/CandidateAuth";

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

interface PublicationClientProps {
  post: Publication;
  returnUrl: string;
}

export default function PublicationClient({ post, returnUrl }: PublicationClientProps) {
  const { user, loading: authLoading, saveUser } = useAuth();
  const [showEmbeddedAuth, setShowEmbeddedAuth] = useState(false);

  const date = new Date(post.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const badge = post.role === "Admin" || post.role === "Formateur" ? post.role : null;

  // ── Chargement initial de la session ──
  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 pt-16 pb-10">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
              <div className="h-4 w-3/5 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
            </div>
          </article>
        </div>
      </main>
    );
  }

  // ── Utilisateur non connecté : Mur d'authentification ──
  if (!user) {
    const loginUrl = `/login?from=${encodeURIComponent(returnUrl)}`;
    const signupUrl = `/login?from=${encodeURIComponent(returnUrl)}&mode=signup`;

    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 pt-16 pb-10">
        <div className="mx-auto max-w-xl space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Sahel Academy
          </Link>

          <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
            {/* En-tête : Auteur et date de la publication */}
            <header className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0d3b32] text-sm font-extrabold text-white">
                {initiales(post.auteurNom)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {post.auteurNom}
                  </h1>
                  {badge && (
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{date}</p>
              </div>
            </header>

            {/* Mur de connexion / Contenu verrouillé */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/60 via-emerald-50/30 to-white dark:from-emerald-950/20 dark:to-slate-900 p-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0d3b32] text-white shadow-md shadow-emerald-950/10">
                <Lock className="h-7 w-7 text-emerald-400" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Accès réservé aux membres
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight pt-1">
                  Connectez-vous pour lire cette actualité
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Cette publication est réservée aux membres de Sahel Academy.
                  Connectez-vous ou inscrivez-vous gratuitement pour accéder au contenu complet,
                  aux photos et aux documents.
                </p>
              </div>

              {/* Boutons d'action principaux vers /login avec redirection automatique */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                <Link
                  href={loginUrl}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-[#0a2d26] hover:bg-[#0d3b32] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition-all active:scale-[0.99]"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>Se connecter</span>
                </Link>

                <Link
                  href={signupUrl}
                  className="flex items-center justify-center gap-2 py-3 px-4 border border-emerald-600/40 hover:border-emerald-600 bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold rounded-2xl transition-all active:scale-[0.99]"
                >
                  <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Créer un compte</span>
                </Link>
              </div>

              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Redirection instantanée vers cette publication dès votre connexion</span>
              </p>

              {/* Option de connexion directe sur place (sans recharger la page) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmbeddedAuth((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {showEmbeddedAuth
                      ? "Masquer le formulaire rapide"
                      : "Ou s'identifier directement ici"}
                  </span>
                  {showEmbeddedAuth ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {showEmbeddedAuth && (
                <div className="pt-3 text-left">
                  <CandidateAuthPanel
                    titre="Identification directe"
                    sousTitre="Connectez-vous pour débloquer immédiatement cette publication."
                    labelConnexion="Se connecter et débloquer"
                    labelInscription="S'inscrire et débloquer"
                    onAuthenticated={saveUser}
                  />
                </div>
              )}
            </div>
          </article>

          {/* Option d'ouverture dans l'application mobile si installée */}
          <BoutonOuvrirApp cheminApp={`/post/${post.id}`} />
        </div>
      </main>
    );
  }

  // ── Utilisateur connecté : Affichage complet de la publication ──
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 pt-16 pb-10">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Sahel Academy
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800 px-3 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Connecté ({user.nom || user.email})</span>
          </span>
        </div>

        <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <header className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0d3b32] text-sm font-extrabold text-white">
              {initiales(post.auteurNom)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {post.auteurNom}
                </h1>
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
                <span className="block text-slate-500">
                  Document à télécharger dans l&apos;application
                </span>
              </p>
            </div>
          )}
        </article>

        <BoutonOuvrirApp cheminApp={`/post/${post.id}`} />
      </div>
    </main>
  );
}
