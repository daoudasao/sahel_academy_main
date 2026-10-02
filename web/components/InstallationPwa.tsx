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

/**
 * Passage du site public vers l'application de l'élève.
 *
 * Android : l'application native, sur Google Play. Ailleurs (iPhone,
 * ordinateur) : l'application web (PWA), qui propose elle-même son
 * installation sur l'écran d'accueil — un site ne peut pas installer une
 * application servie depuis une autre adresse.
 */
export default function InstallationPwa({ suite }: { suite?: string }) {
  const lienWeb = suite ? `${PWA_URL}${suite}` : PWA_URL;
  // Le rendu serveur ne connaît pas l'appareil : « non Android » par défaut.
  const android = useSyncExternalStore(
    abonnementVide,
    () => /android/i.test(navigator.userAgent),
    () => false,
  );

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

  if (android) {
    return (
      <div className="space-y-2">
        {boutonPlay}
        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          Installez l&apos;application, puis connectez-vous avec le même compte.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <a
        href={lienWeb}
        className="w-full py-3.5 px-4 bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-3 group"
      >
        <Smartphone className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span>Ouvrir mon espace Sahel Academy</span>
        <ArrowRight className="w-4 h-4 text-emerald-400/80 ml-auto" />
      </a>
      <p className="text-[11px] text-slate-500 text-center leading-relaxed">
        Sur iPhone, l&apos;application vous proposera de l&apos;installer sur
        votre écran d&apos;accueil. Sur Android, elle est sur{" "}
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-emerald-700 dark:text-emerald-400 underline underline-offset-2"
        >
          Google Play
        </a>
        .
      </p>
    </div>
  );
}
