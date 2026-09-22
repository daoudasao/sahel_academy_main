"use client";

import { CheckCircle2, Smartphone, Sparkles, ShieldCheck, GraduationCap, Hourglass } from "lucide-react";
import InstallationPwa from "./InstallationPwa";

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName?: string;
  bourseTitre?: string;
  /** Adapte les libellés selon qu'on sort d'une candidature ou d'une inscription. */
  typeOffre?: "bourse" | "formation";
  /**
   * Situation réelle de l'élève. Sans ça le modal annonce un envoi qui vient
   * d'avoir lieu, alors qu'on l'ouvre aussi depuis une demande déjà déposée ou
   * une inscription déjà validée.
   */
  etat?: "envoye" | "en_attente" | "inscrit";
}

export default function AppDownloadModal({
  isOpen,
  onClose,
  candidateName,
  bourseTitre,
  typeOffre = "bourse",
  etat = "envoye",
}: AppDownloadModalProps) {
  if (!isOpen) return null;

  const estFormation = typeOffre === "formation";
  const offre = estFormation ? "la formation" : "la bourse";
  const nom = bourseTitre || "sélectionnée";

  const contenus = {
    envoye: {
      Icone: CheckCircle2,
      badge: estFormation
        ? "Demande d'inscription envoyée !"
        : "Candidature enregistrée avec succès !",
      titre: `Félicitations ${candidateName ?? ""} !`,
      soustitre: (
        <>
          Votre demande pour {offre}{" "}
          <strong className="text-amber-300">{nom}</strong> a bien été
          enregistrée dans notre système.
        </>
      ),
      encartTitre: "📱 Suivez votre dossier dans l'application",
      encartTexte: (
        <>
          Installez l&apos;application <strong>Sahel Academy</strong> pour
          recevoir les résultats en temps réel et accéder à vos cours.
        </>
      ),
      puces: [
        "Notifications en direct sur le statut de votre admission",
        "Accès à l'espace de cours interactif et aux ressources",
      ],
    },
    en_attente: {
      Icone: Hourglass,
      badge: "Demande en cours d'examen",
      titre: `Bonjour ${candidateName ?? ""}`,
      soustitre: (
        <>
          Votre demande pour {offre}{" "}
          <strong className="text-amber-300">{nom}</strong> a déjà été déposée et
          attend la validation de l&apos;administration.
        </>
      ),
      encartTitre: "📱 Suivez l'avancement dans l'application",
      encartTexte: (
        <>
          Installez l&apos;application <strong>Sahel Academy</strong> pour être
          averti(e) dès que votre demande est traitée.
        </>
      ),
      puces: [
        "Notification immédiate dès la validation de votre demande",
        "Échange direct avec l'administration depuis le support",
      ],
    },
    inscrit: {
      Icone: GraduationCap,
      badge: "Vous êtes déjà inscrit(e)",
      titre: `Bonjour ${candidateName ?? ""}`,
      soustitre: (
        <>
          Votre inscription à {offre}{" "}
          <strong className="text-amber-300">{nom}</strong> est validée. Vos
          cours vous attendent dans l&apos;application.
        </>
      ),
      encartTitre: "📱 Accédez à vos cours dans l'application",
      encartTexte: (
        <>
          Installez l&apos;application <strong>Sahel Academy</strong> pour
          ouvrir votre espace de classe et vos ressources.
        </>
      ),
      puces: [
        "Cours, documents et devoirs de votre classe",
        "Échanges avec votre formateur et suivi des paiements",
      ],
    },
  } as const;

  const contenu = contenus[etat];
  const Icone = contenu.Icone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 text-center animate-in zoom-in-95 duration-300">
        
        {/* Decorative Top Banner */}
        <div className="bg-gradient-to-br from-[#0a2d26] via-[#0d3b32] to-[#145346] px-6 pt-8 pb-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

          {/* Status Badge */}
          <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-400/40 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Icone className="w-10 h-10 text-emerald-300" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-semibold border border-emerald-400/30 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            {contenu.badge}
          </span>

          <h2 className="text-2xl font-black tracking-tight text-white mt-1">
            {contenu.titre}
          </h2>

          <p className="text-xs text-emerald-100/80 mt-2 max-w-sm mx-auto leading-relaxed">
            {contenu.soustitre}
          </p>
        </div>

        {/* Invitation Content */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0a2d26] text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {contenu.encartTitre}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {contenu.encartTexte}
                </p>
              </div>
            </div>

            <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-emerald-100/80">
              {contenu.puces.map((puce) => (
                <li key={puce} className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{puce}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Installation de l'application web */}
          <InstallationPwa />

          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors pt-2 block mx-auto cursor-pointer"
          >
            Fermer et retourner à l&apos;accueil
          </button>
        </div>
      </div>
    </div>
  );
}
