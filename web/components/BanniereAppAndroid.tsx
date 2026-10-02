"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { PLAY_STORE_URL } from "@/lib/app-mobile";

const CLE_FERMETURE = "sa_banniere_play_fermee";
/** Une fois refermé, le bandeau ne revient pas avant une semaine. */
const DELAI_RAPPEL = 7 * 24 * 3600 * 1000;

const abonnementVide = () => () => {};

function doitAfficher(): boolean {
  if (!/android/i.test(navigator.userAgent)) return false;
  try {
    const fermee = Number(localStorage.getItem(CLE_FERMETURE) || 0);
    return Date.now() - fermee >= DELAI_RAPPEL;
  } catch {
    return true;
  }
}

/**
 * Bandeau « l'application est sur Google Play », sur Android uniquement.
 *
 * Quand l'app est installée, Android ouvre directement les liens
 * sahel-academy.com/app/… dans l'app (App Links) : la personne qui voit ce
 * site depuis un lien partagé n'a donc, en principe, pas encore l'app.
 */
export default function BanniereAppAndroid() {
  const pathname = usePathname();
  const visibleAuChargement = useSyncExternalStore(abonnementVide, doitAfficher, () => false);
  const [fermee, setFermee] = useState(false);

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/login")) return null;
  if (!visibleAuChargement || fermee) return null;

  const fermer = () => {
    try {
      localStorage.setItem(CLE_FERMETURE, String(Date.now()));
    } catch {}
    setFermee(true);
  };

  return (
    <>
      {/* Réserve la place du bandeau en bas de page pour ne rien masquer. */}
      <div aria-hidden="true" className="h-24 shrink-0" />
      <div
        role="region"
        aria-label="Application Sahel Academy"
        className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-2xl border border-amber-400/50 bg-[#0f3b32] p-3 pl-4 text-white shadow-2xl"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
        <p className="flex-1 text-xs leading-snug text-white">
          <span className="block font-bold text-white">Sahel Academy</span>
          <span className="text-emerald-100/90">L&apos;application est sur Google Play</span>
        </p>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-[#0a2d26]"
        >
          Installer
        </a>
        <button
          type="button"
          onClick={fermer}
          aria-label="Fermer"
          className="shrink-0 p-1 text-white/60 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
