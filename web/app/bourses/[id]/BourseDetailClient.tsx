"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bourse, Champ, postulerBourse } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { CandidateAuthPanel, CandidateBadge, ProfilCompletionCard } from "@/components/CandidateAuth";
import AppDownloadModal from "@/components/AppDownloadModal";
import {
  GraduationCap,
  Calendar,
  Clock,
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle2,
  FileText,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

interface BourseDetailClientProps {
  bourse: Bourse;
}

export default function BourseDetailClient({ bourse }: BourseDetailClientProps) {
  const { user, loading: authLoading, saveUser, logout, besoinCompletion, completerProfil, authError } = useAuth();

  // Candidature state
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [reponses, setReponses] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successSubmitted, setSuccessSubmitted] = useState(false);

  const handleInputChange = (fieldKeyOrId: string, value: any) => {
    setReponses((prev) => ({
      ...prev,
      [fieldKeyOrId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (bourse.statut === "fermee") {
      setError("Les candidatures pour cette bourse sont désormais closes.");
      return;
    }

    if (!user) return;

    setSubmitting(true);
    try {
      await postulerBourse(bourse.id, user, reponses);
      setSuccessSubmitted(true);
      setDownloadModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la soumission de la candidature.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dStr: string) => {
    try {
      return new Date(dStr).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dStr;
    }
  };

  return (
    <main className="portal-bg min-h-screen py-10 px-4 relative z-10">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md px-4 py-2 text-xs font-bold text-emerald-950 shadow-md transition hover:-translate-x-1 hover:bg-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l&apos;accueil</span>
        </Link>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-[#0a2d26] via-[#0d3b32] to-[#124b40] p-6 sm:p-8 text-white relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner">
                  {bourse.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={bourse.imageUrl}
                      alt={bourse.titre}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <GraduationCap className="w-8 h-8 text-emerald-300" />
                  )}
                </div>
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      bourse.statut === "fermee"
                        ? "bg-slate-500/20 text-slate-300 border-slate-500/30"
                        : "bg-emerald-400/20 text-emerald-200 border-emerald-400/30"
                    }`}
                  >
                    {bourse.statut === "fermee" ? "Bourse clôturée" : "Bourse ouverte"}
                  </span>
                  <h1 className="text-2xl font-black text-white mt-1 leading-tight">
                    {bourse.titre}
                  </h1>
                </div>
              </div>
            </div>

            {/* Dates row */}
            <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-emerald-800/60 text-xs text-emerald-100/90">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Publiée le : <strong>{formatDate(bourse.datePublication)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-300" />
                <span>Date limite : <strong className="text-amber-200">{formatDate(bourse.dateLimite)}</strong></span>
              </div>
            </div>
          </div>

          {/* Description */}
          {bourse.description && (
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-white">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Description de l&apos;offre</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {bourse.description}
              </p>
            </div>
          )}

          {/* Section Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {bourse.statut === "fermee" ? (
              <div className="p-8 rounded-3xl bg-amber-50/80 border border-amber-200 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-950">
                    Les candidatures pour cette bourse sont closes
                  </h3>
                  <p className="text-xs text-amber-800 max-w-md mx-auto mt-1 leading-relaxed">
                    La période de dépôt des dossiers pour &quot;{bourse.titre}&quot; est désormais terminée. Le jury examine actuellement les candidatures reçues.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a2d26] text-white font-bold text-xs hover:bg-[#0d3b32] transition shadow-xs"
                  >
                    <span>Découvrir les autres opportunités</span>
                  </Link>
                </div>
              </div>
            ) : authLoading ? (
              <div className="py-10 flex justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" />
              </div>
            ) : !user ? (
              <div className="space-y-3">
                {authError && (
                  <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                    <span>{authError}</span>
                  </div>
                )}
                <CandidateAuthPanel
                  titre="Connectez-vous pour postuler"
                  sousTitre="Un compte suffit pour accéder au formulaire de candidature."
                  labelConnexion="Se connecter et postuler"
                  labelInscription="Créer mon compte et postuler"
                  onAuthenticated={saveUser}
                />
              </div>
            ) : besoinCompletion ? (
              <ProfilCompletionCard user={user} onSubmit={completerProfil} />
            ) : (
              /* User Profile Badge + Application Form (Only visible once connected) */
              <>
                <CandidateBadge user={user} onLogout={logout} />

                {successSubmitted ? (
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                    <h3 className="text-lg font-bold text-emerald-900">
                      Votre candidature a bien été transmise !
                    </h3>
                    <p className="text-xs text-emerald-700 max-w-md mx-auto">
                      Installez l&apos;application Sahel Academy pour suivre votre dossier et accéder à vos cours.
                    </p>
                    <button
                      type="button"
                      onClick={() => setDownloadModalOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a2d26] text-white font-bold text-xs hover:bg-[#0d3b32] transition"
                    >
                      <span>Installer l&apos;application</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-700" />
                        <span>Formulaire de candidature</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Remplissez les informations requises pour valider votre postulation.
                      </p>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Render Form Fields */}
                    <div className="space-y-4">
                      {/* Custom Bourse Fields (Filtering out duplicate user profile fields already known) */}
                      {bourse.champs && bourse.champs.length > 0 && (
                        bourse.champs
                          .filter((champ: Champ) => {
                            const label = (champ.label || "").toLowerCase().trim();
                            const cle = (champ.cle || "").toLowerCase().trim();
                            const isDuplicate =
                              label === "nom" ||
                              label === "nom complet" ||
                              label === "nom & prénom" ||
                              label === "nom et prénom" ||
                              label === "email" ||
                              label === "adresse email" ||
                              label === "e-mail" ||
                              cle === "nom" ||
                              cle === "email";
                            return !isDuplicate;
                          })
                          .map((champ: Champ) => {
                            const key = champ.cle || champ.id || champ.label;

                            if (champ.type === "lien") {
                              const rawUrl = (champ.options && champ.options[0]) ? champ.options[0] : (champ.aide?.startsWith("http") ? champ.aide : "");
                              const href = rawUrl && (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) ? rawUrl : rawUrl ? `https://${rawUrl}` : "#";

                              return (
                                <div key={champ.id} className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-slate-50 border border-emerald-200/80 shadow-sm space-y-2.5">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                        <ExternalLink className="w-3 h-3 text-emerald-700" />
                                        <span>Lien informatif</span>
                                      </div>
                                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                        {champ.label || "Ressource complémentaire"}
                                      </h4>
                                      {champ.aide && (
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                          {champ.aide}
                                        </p>
                                      )}
                                    </div>
                                    {rawUrl && (
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] text-white text-xs font-bold transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
                                      >
                                        <span>Consulter le lien</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={champ.id} className="space-y-1">
                                <label className="block text-xs font-bold text-slate-700">
                                  {champ.label}
                                  {champ.obligatoire && <span className="text-red-500 ml-0.5">*</span>}
                                </label>

                              {champ.aide && (
                                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  <span>{champ.aide}</span>
                                </p>
                              )}

                              {champ.type === "paragraphe" ? (
                                <textarea
                                  required={champ.obligatoire}
                                  rows={3}
                                  value={reponses[key] || ""}
                                  onChange={(e) => handleInputChange(key, e.target.value)}
                                  placeholder={`Entrez votre réponse...`}
                                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                                />
                              ) : champ.type === "choix" ? (
                                <select
                                  required={champ.obligatoire}
                                  value={reponses[key] || ""}
                                  onChange={(e) => handleInputChange(key, e.target.value)}
                                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                                >
                                  <option value="">-- Sélectionnez une option --</option>
                                  {champ.options.map((opt, i) => (
                                    <option key={i} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={
                                    champ.type === "email"
                                      ? "email"
                                      : champ.type === "telephone"
                                      ? "tel"
                                      : champ.type === "nombre"
                                      ? "number"
                                      : "text"
                                  }
                                  required={champ.obligatoire}
                                  value={reponses[key] || ""}
                                  onChange={(e) => handleInputChange(key, e.target.value)}
                                  placeholder={`Votre réponse...`}
                                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                                />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Submit Action */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 px-6 bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? (
                        <span>Envoi en cours...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Soumettre ma candidature</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile App Download Modal */}
      <AppDownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        candidateName={user?.nom}
        bourseTitre={bourse.titre}
      />
    </main>
  );
}
