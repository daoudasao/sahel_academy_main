"use client";

import { useSyncExternalStore } from "react";
import { ArrowRight, Smartphone } from "lucide-react";
import { PLAY_STORE_URL, PWA_URL } from "@/lib/app-mobile";

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

/** L'appareil ne change pas en cours de visite : rien à écouter. */
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
 * Passage du site public vers l'application de l'élève.
 *
 * Android : l'application native, sur Google Play. iPhone : l'application
 * web (PWA), qui propose elle-même son installation sur l'écran d'accueil —
 * un site ne peut pas installer une application servie depuis une autre
 * adresse. Ordinateur : la PWA, plus le lien Google Play.
 */
export default function InstallationPwa({ suite }: { suite?: string }) {
  const lienWeb = suite ? `${PWA_URL}${suite}` : PWA_URL;
  // Le rendu serveur ne connaît pas l'appareil : « autre » par défaut.
  const appareil = useSyncExternalStore(abonnementVide, detecterAppareil, () => "autre" as const);

  const boutonPlay = (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full py-3.5 px-4 bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-3 group"
    >
      <IconePlay className="w-5 h-5 group-hover:scale-110 transition-transform" />
      <span>Télécharger sur Google Play</span>
      <ArrowRight className="w-4 h-4 text-emerald-400/80 ml-auto" />
    </a>
  );

  if (appareil === "android") {
    return (
      <div className="space-y-2">
        {boutonPlay}
        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          Installez l&apos;application, puis connectez-vous avec le même compte.
        </p>
      </div>
    );
  }

  const boutonWeb = (
    <a
      href={lienWeb}
      className="w-full py-3.5 px-4 bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-3 group"
    >
      <Smartphone className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
      <span>Ouvrir mon espace Sahel Academy</span>
      <ArrowRight className="w-4 h-4 text-emerald-400/80 ml-auto" />
    </a>
  );

  if (appareil === "iphone") {
    return (
      <div className="space-y-2">
        {boutonWeb}
        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          L&apos;application vous proposera de l&apos;installer sur votre écran
          d&apos;accueil, pour la retrouver comme une application classique.
        </p>
      </div>
    );
  }

  // Ordinateur : l'espace web tout de suite, ou l'app Android pour plus tard.
  return (
    <div className="space-y-2.5">
      {boutonWeb}
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
