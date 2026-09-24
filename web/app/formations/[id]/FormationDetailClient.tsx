"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bourse,
  DemandeInscription,
  Formation,
  demanderInscription,
  fetchMesDemandes,
} from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { CandidateAuthPanel, CandidateBadge, ProfilCompletionCard } from "@/components/CandidateAuth";
import AppDownloadModal from "@/components/AppDownloadModal";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  GraduationCap,
  Hourglass,
  Send,
  Sparkles,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";

interface FormationDetailClientProps {
  formation: Formation;
  bourseLiee: Bourse | null;
}

const formatFCFA = (n: number) => `${(n || 0).toLocaleString("fr-FR")} FCFA`;

const formatDate = (iso?: string) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
};

export default function FormationDetailClient({
  formation,
  bourseLiee,
}: FormationDetailClientProps) {
  const { user, loading: authLoading, saveUser, logout, besoinCompletion, completerProfil, authError } = useAuth();

  // La demande est mémorisée avec l'id de son propriétaire : après une
  // déconnexion / reconnexion, l'état du compte précédent n'est jamais réutilisé.
  const [demandeChargee, setDemandeChargee] = useState<{
    userId: string;
    demande: DemandeInscription | null;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Le modal sert trois situations distinctes (envoi, demande en attente,
  // inscription validée) : on mémorise laquelle plutôt qu'un simple booléen,
  // sinon il félicite d'un envoi pour un élève déjà admis.
  const [modalEtat, setModalEtat] = useState<
    "envoye" | "en_attente" | "inscrit" | null
  >(null);

  // Une demande déjà envoyée (depuis le site ou l'app) doit être reflétée ici,
  // sinon l'élève renvoie la même demande sans comprendre où elle en est.
  useEffect(() => {
    if (!user) return;

    let annule = false;
    fetchMesDemandes(user).then((demandes) => {
      if (annule) return;
      setDemandeChargee({
        userId: user.id,
        demande: demandes.find((d) => d.formationId === formation.id) ?? null,
      });
    });

    return () => {
      annule = true;
    };
  }, [user, formation.id]);

  const etatDemande =
    user && demandeChargee?.userId === user.id ? demandeChargee : null;
  const demande = etatDemande?.demande ?? null;
  const chargementDemande = !!user && !etatDemande;

  const handleDemande = useCallback(async () => {
    if (!user) return;

    setError(null);
    setSubmitting(true);
    try {
      const res = await demanderInscription(formation.id, user);
      setDemandeChargee({ userId: user.id, demande: res });
      setModalEtat("envoye");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'envoi de votre demande d'inscription."
      );
    } finally {
      setSubmitting(false);
    }
  }, [user, formation.id]);

  const statut = demande?.statut;
  const dateEnvoi = formatDate(demande?.createdAt);
  const dateValidation = formatDate(demande?.updatedAt ?? demande?.createdAt);

  return (
    <main className="portal-bg min-h-screen py-10 px-4 relative z-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md px-4 py-2 text-xs font-bold text-emerald-950 shadow-md transition hover:-translate-x-1 hover:bg-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l&apos;accueil</span>
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Bandeau */}
          <div className="bg-gradient-to-br from-[#0a2d26] via-[#0d3b32] to-[#124b40] p-6 sm:p-8 text-white relative">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                {formation.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formation.imageUrl}
                    alt={formation.titre}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <BookOpen className="w-8 h-8 text-emerald-300" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[11px] font-bold border border-emerald-400/30">
                    Formation ouverte
                  </span>
                  {formation.departement?.nom && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-100 text-[11px] font-semibold border border-white/15">
                      {formation.departement.nom}
                    </span>
                  )}
                  {formation.niveau && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-100 text-[11px] font-semibold border border-white/15">
                      Niveau {formation.niveau}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-black text-white mt-1.5 leading-tight">
                  {formation.titre}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-emerald-800/60 text-xs text-emerald-100/90">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>
                  Durée : <strong>{formation.dureeMois} mois</strong>
                </span>
              </div>
              {formation.formateur?.nom && (
                <div className="flex items-center gap-1.5">
                  <UserRound className="w-4 h-4 text-emerald-400" />
                  <span>
                    Formateur : <strong>{formation.formateur.nom}</strong>
                  </span>
                </div>
              )}
              {formation.dateLimite && (
                <div className="flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-amber-300" />
                  <span>
                    Clôture :{" "}
                    <strong className="text-amber-200">
                      {new Date(formation.dateLimite).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tarifs */}
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Frais d&apos;inscription</span>
              </div>
              <p className="text-lg font-black text-slate-900 mt-1">
                {formation.prixInscription > 0
                  ? formatFCFA(formation.prixInscription)
                  : "Gratuit"}
              </p>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                <CalendarClock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mensualité</span>
              </div>
              <p className="text-lg font-black text-slate-900 mt-1">
                {formation.prixMensualite > 0
                  ? `${formatFCFA(formation.prixMensualite)} / mois`
                  : "Aucune"}
              </p>
            </div>
          </div>

          {formation.description && (
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-white">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                À propos de cette formation
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {formation.description}
              </p>
            </div>
          )}

          {/* Raccourci bourse : la formation est aussi finançable par bourse */}
          {bourseLiee && (
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-amber-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-amber-200 bg-white p-5">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Une bourse est ouverte pour cette formation
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {bourseLiee.titre} — postulez pour suivre ce cours sans en
                    payer les frais.
                  </p>
                </div>
                <Link
                  href={`/bourses/${bourseLiee.id}`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0a2d26] text-white text-xs font-bold hover:bg-[#0d3b32] shadow-sm transition-all shrink-0"
                >
                  <GraduationCap className="w-4 h-4 text-emerald-300" />
                  <span>Postuler à la bourse</span>
                </Link>
              </div>
            </div>
          )}

          {/* Inscription au cours */}
          <div className="p-6 sm:p-8 space-y-6">
            {authLoading ? (
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
                  titre="Connectez-vous pour vous inscrire"
                  sousTitre="Un compte suffit pour envoyer votre demande."
                  labelConnexion="Se connecter et m'inscrire"
                  labelInscription="Créer mon compte et m'inscrire"
                  onAuthenticated={saveUser}
                />
              </div>
            ) : besoinCompletion ? (
              <ProfilCompletionCard user={user} onSubmit={completerProfil} />
            ) : (
              <>
                <CandidateBadge user={user} onLogout={logout} />

                {error && (
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {chargementDemande ? (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs font-semibold text-slate-500">
                    Vérification de votre inscription...
                  </div>
                ) : statut === "valide" ? (
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                    <h3 className="text-lg font-bold text-emerald-900">
                      Vous êtes déjà inscrit(e) à cette formation
                    </h3>
                    {dateValidation && (
                      <p className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-200 text-[11px] font-bold text-emerald-800">
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span>Inscription validée le {dateValidation}</span>
                      </p>
                    )}
                    <p className="text-xs text-emerald-700 max-w-md mx-auto">
                      Votre demande avait déjà été acceptée par
                      l&apos;administration : rien de nouveau n&apos;a été envoyé
                      en vous connectant. Les cours, documents et échanges de
                      classe se déroulent dans l&apos;application mobile.
                    </p>
                    <button
                      type="button"
                      onClick={() => setModalEtat("inscrit")}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a2d26] text-white font-bold text-xs hover:bg-[#0d3b32] transition"
                    >
                      <span>Accéder à mes cours sur l&apos;application</span>
                    </button>
                  </div>
                ) : statut === "en_attente" ? (
                  <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
                    <Hourglass className="w-12 h-12 text-amber-600 mx-auto" />
                    <h3 className="text-lg font-bold text-amber-900">
                      Vous avez déjà demandé cette formation
                    </h3>
                    {dateEnvoi && (
                      <p className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-amber-200 text-[11px] font-bold text-amber-800">
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span>Demande envoyée le {dateEnvoi}</span>
                      </p>
                    )}
                    <p className="text-xs text-amber-800 max-w-md mx-auto">
                      Elle est en cours d&apos;examen : votre connexion n&apos;a
                      donc envoyé aucune nouvelle demande. L&apos;administration
                      vous recontactera pour finaliser les modalités, et vous
                      serez averti(e) par notification dès la validation.
                    </p>
                    <button
                      type="button"
                      onClick={() => setModalEtat("en_attente")}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a2d26] text-white font-bold text-xs hover:bg-[#0d3b32] transition"
                    >
                      <span>Suivre ma demande sur l&apos;application</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {statut === "refuse" && (
                      <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <span>
                          Votre précédente demande pour cette formation n&apos;a
                          pas été retenue. Vous pouvez en soumettre une nouvelle.
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleDemande}
                      disabled={submitting}
                      className="w-full py-3.5 px-6 bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? (
                        <span>Envoi en cours...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Demander mon inscription</span>
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                      Votre demande est transmise à l&apos;administration, qui
                      vous contactera pour finaliser les modalités.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <AppDownloadModal
        isOpen={modalEtat !== null}
        onClose={() => setModalEtat(null)}
        candidateName={user?.nom}
        bourseTitre={formation.titre}
        typeOffre="formation"
        etat={modalEtat ?? "envoye"}
      />
    </main>
  );
}
