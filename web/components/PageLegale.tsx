import Link from "next/link";
import type { ReactNode } from "react";

/** Contact affiché sur les pages légales (même numéro que le bouton WhatsApp du site). */
export const CONTACT_WHATSAPP = {
  affichage: "+223 71 49 31 77",
  lien: "https://wa.me/22371493177",
};

/**
 * Mise en page commune des pages légales publiques (politique de
 * confidentialité, suppression de compte). Ces pages sont exigées par Google
 * Play : elles doivent rester accessibles sans compte.
 */
export default function PageLegale({
  titre,
  miseAJour,
  children,
}: {
  titre: string;
  miseAJour: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <article className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-900">
        <Link
          href="/"
          className="text-sm font-semibold text-emerald-800 hover:underline dark:text-emerald-400"
        >
          ← Sahel Academy
        </Link>
        <h1 className="mt-4 font-[family-name:var(--font-jakarta)] text-2xl font-extrabold text-emerald-950 sm:text-3xl dark:text-emerald-300">
          {titre}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Dernière mise à jour : {miseAJour}
        </p>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-emerald-950 dark:[&_h2]:text-emerald-300 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_a]:font-semibold [&_a]:text-emerald-800 [&_a]:underline dark:[&_a]:text-emerald-400">
          {children}
        </div>
      </article>
    </main>
  );
}
