"use client";

import { useSyncExternalStore } from "react";
import { ArrowRight, Smartphone } from "lucide-react";
import { ANDROID_PACKAGE, PLAY_STORE_URL, PWA_URL } from "@/lib/app-mobile";

/**
 * Bouton contextuel en bas d'une page de partage (`/app/post/:id`, etc.).
 *
 * ▸ **Android** : un lien Android Intent qui ouvre l'app si elle est installée,
 *   ou redirige vers Google Play si elle ne l'est pas. Le bandeau fixe
 *   `BanniereAppAndroid` du layout complète en affichant « Installer ».
 * ▸ **iPhone** : lien vers la PWA (pas de Play Store sur iOS).
 * ▸ **Ordinateur** : lien vers la PWA + second lien Play Store.
 */

/** Logo Google Play (triangle simplifié). */
function IconePlay({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="#34d399" d="M3.6 1.8 13.8 12 3.6 22.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1Z" />
      <path fill="#fbbf24" d="m17.2 8.6-3.4 3.4 3.4 3.4 3.9-2.2c.8-.5.8-1.7 0-2.2l-3.9-2.4Z" />
      <path fill="#f87171" d="M13.8 12 3.6 22.2c.3.2.8.2 1.2 0l12.4-6.8-3.4-3.4Z" />
      <path fill="#60a5fa" d="M3.6 1.8 13.8 12l3.4-3.4L4.8 1.8c-.4-.2-.9-.2-1.2 0Z" />
    </svg>
  );
}

const abonnementVide = () => () => {};

type Appareil = "android" | "iphone" | "autre";

function detecterAppareil(): Appareil {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && "ontouchend" in document)) {
    return "iphone";
  }
  return "autre";
}

/**
 * Construit un lien Android Intent qui :
 *  1. Ouvre `sahel-academy.com/app/…` dans l'app (si elle est installée)
 *  2. Sinon, redirige vers la fiche Google Play
 *
 * @see https://developer.chrome.com/docs/android/intents
 */
function intentAndroid(cheminApp: string): string {
  const path = `/app${cheminApp}`;
  return `intent://sahel-academy.com${path}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`;
}

interface BoutonOuvrirAppProps {
  /** Chemin dans l'app, par ex. `/post/abc123` (sans le préfixe `/app`). */
  cheminApp: string;
}

export default function BoutonOuvrirApp({ cheminApp }: BoutonOuvrirAppProps) {
  const appareil = useSyncExternalStore(abonnementVide, detecterAppareil, () => "autre" as const);

  // ── Android ────────────────────────────────────────────────────────────
  if (appareil === "android") {
    return (
      <div className="space-y-3">
        <a
          href={intentAndroid(cheminApp)}
          className="w-full py-3.5 px-4 bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-3 group"
        >
          <Smartphone className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>Ouvrir dans l&apos;application</span>
          <ArrowRight className="w-4 h-4 text-emerald-400/80 ml-auto" />
        </a>
        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          Si l&apos;application n&apos;est pas installée, vous serez redirigé
          vers Google Play.
        </p>
      </div>
    );
  }

  // ── iPhone ─────────────────────────────────────────────────────────────
  const lienWeb = `${PWA_URL}${cheminApp}`;

  if (appareil === "iphone") {
    return (
      <div className="space-y-2">
        <a
          href={lienWeb}
          className="w-full py-3.5 px-4 bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-3 group"
        >
          <Smartphone className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>Ouvrir dans mon espace Sahel Academy</span>
          <ArrowRight className="w-4 h-4 text-emerald-400/80 ml-auto" />
        </a>
      </div>
    );
  }

  // ── Ordinateur ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-2.5">
      <a
        href={lienWeb}
        className="w-full py-3.5 px-4 bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-3 group"
      >
        <Smartphone className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span>Ouvrir dans mon espace Sahel Academy</span>
        <ArrowRight className="w-4 h-4 text-emerald-400/80 ml-auto" />
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 px-4 border border-slate-300 dark:border-slate-700 hover:border-emerald-600 dark:hover:border-emerald-500 text-slate-800 dark:text-slate-100 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-3 group"
      >
        <IconePlay className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span>Télécharger l&apos;app Android sur Google Play</span>
      </a>
    </div>
  );
}
