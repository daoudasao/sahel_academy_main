import { ArrowRight, Smartphone } from "lucide-react";

/** Application web (PWA) : l'espace connecté de l'élève. */
const PWA_URL = "https://sahel-academy.web.app";

/**
 * Passage du site public vers l'application web (PWA), où l'élève suit son
 * dossier et ses cours.
 *
 * L'installation elle-même est proposée *par* l'application : un site ne peut
 * pas installer une application servie depuis une autre adresse. La PWA
 * affiche sa propre invitation (bannière Android, marche à suivre iPhone).
 */
export default function InstallationPwa({ suite }: { suite?: string }) {
  const lien = suite ? `${PWA_URL}${suite}` : PWA_URL;

  return (
    <div className="space-y-2">
      <a
        href={lien}
        className="w-full py-3.5 px-4 bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-3 group"
      >
        <Smartphone className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span>Ouvrir mon espace Sahel Academy</span>
        <ArrowRight className="w-4 h-4 text-emerald-400/80 ml-auto" />
      </a>
      <p className="text-[11px] text-slate-500 text-center leading-relaxed">
        L&apos;application vous proposera de l&apos;installer sur votre écran
        d&apos;accueil, pour la retrouver comme une application classique.
      </p>
    </div>
  );
}
