"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CandidatureItem,
  fetchMesCandidatures,
} from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import {
  CandidateAuthPanel,
  CandidateBadge,
  ProfilCompletionCard,
} from "@/components/CandidateAuth";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileText,
  User,
} from "lucide-react";

type FilterStatut = "tous" | "admis" | "en_attente" | "refuse";

export default function CandidaturesClient() {
  const {
    user,
    loading: authLoading,
    saveUser,
    logout,
    besoinCompletion,
    completerProfil,
    authError,
  } = useAuth();

  const [candidatures, setCandidatures] = useState<CandidatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtre, setFiltre] = useState<FilterStatut>("tous");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const chargerCandidatures = async () => {
    if (!user) {
      setCandidatures([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchMesCandidatures(user);
      setCandidatures(data);
    } catch (err) {
      console.error("Erreur chargement candidatures:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      chargerCandidatures();
    }
  }, [user, authLoading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await chargerCandidatures();
  };

  const formatDate = (dStr?: string) => {
    if (!dStr) return "Date non renseignée";
    try {
      return new Date(dStr).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dStr;
    }
  };

  // Métriques
  const total = candidatures.length;
  const nbAdmis = candidatures.filter((c) => c.statut === "admis").length;
  const nbEnAttente = candidatures.filter(
    (c) => c.statut === "en_attente" || !c.statut
  ).length;
  const nbRefuses = candidatures.filter((c) => c.statut === "refuse").length;

  const filtrates = candidatures.filter((c) => {
    if (filtre === "admis") return c.statut === "admis";
    if (filtre === "en_attente")
      return c.statut === "en_attente" || !c.statut;
    if (filtre === "refuse") return c.statut === "refuse";
    return true;
  });

  return (
    <main className="portal-bg min-h-screen py-10 px-4 flex flex-col items-center justify-start relative z-10">
      <div className="w-full max-w-2xl space-y-6">
        {/* Navigation retour & info */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 shadow-md transition hover:-translate-x-1 hover:border-emerald-500/50"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Retour à l&apos;accueil</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowInfo((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 shadow-md hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            title="Comment fonctionne le suivi ?"
          >
            <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Comment ça marche ?</span>
          </button>
        </div>

        {/* Panneau d'information explicatif (accordéon) */}
        {showInfo && (
          <div className="p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Guide de suivi des candidatures</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
              >
                Fermer
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>En attente</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Votre dossier a bien été transmis et est actuellement examiné par notre commission.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Admis(e)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Félicitations ! Votre demande est validée. Vous pouvez télécharger votre attestation d&apos;admission.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Non retenu</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Votre dossier n&apos;a pas été sélectionné pour cette session. Vous pouvez retenter votre chance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Authentification requise si non connecté */}
        {authLoading ? (
          <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 text-center border border-slate-200 dark:border-slate-800 shadow-xl">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Vérification de votre compte...
            </p>
          </div>
        ) : !user ? (
          <div className="space-y-4">
            {authError && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                <span>{authError}</span>
              </div>
            )}
            <CandidateAuthPanel
              titre="Suivi de mes candidatures"
              sousTitre="Connectez-vous pour consulter le statut de vos dossiers et vos décisions d'admission."
              labelConnexion="Se connecter et voir mes candidatures"
              labelInscription="Créer un compte candidat"
              onAuthenticated={saveUser}
            />
          </div>
        ) : besoinCompletion ? (
          <ProfilCompletionCard user={user} onSubmit={completerProfil} />
        ) : (
          /* Utilisateur connecté : Vue Dashboard Candidatures */
          <div className="space-y-6">
            {/* Badge Utilisateur connecté */}
            <CandidateBadge user={user} onLogout={logout} />

            {/* Carte Résumé du Dashboard (similaire à l'app mobile) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a2d26] via-[#0d3b32] to-[#124b40] p-6 text-white shadow-xl shadow-emerald-950/20 ring-1 ring-emerald-500/20">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-sm text-emerald-100 border border-white/10">
                  <FileText className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Tableau de bord</span>
                </span>
                <span className="text-xs font-medium text-emerald-200">
                  {total} dossier{total > 1 ? "s" : ""}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Ensemble de vos candidatures
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-emerald-100/85">
                Suivez l&apos;avancement et les décisions de l&apos;académie en temps réel.
              </p>

              {/* Cartouches de statistiques rapides */}
              <div className="grid grid-cols-3 gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setFiltre("admis")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    filtre === "admis"
                      ? "bg-emerald-500/30 border-emerald-400 ring-2 ring-emerald-400/50"
                      : "bg-white/10 border-white/15 hover:bg-white/15"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">Admis(es)</span>
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {nbAdmis}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltre("en_attente")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    filtre === "en_attente"
                      ? "bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/50"
                      : "bg-white/10 border-white/15 hover:bg-white/15"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-200">
                    <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">En attente</span>
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {nbEnAttente}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltre("refuse")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    filtre === "refuse"
                      ? "bg-slate-500/30 border-slate-300 ring-2 ring-slate-300/50"
                      : "bg-white/10 border-white/15 hover:bg-white/15"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                    <AlertCircle className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">Non retenus</span>
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {nbRefuses}
                  </div>
                </button>
              </div>
            </div>

            {/* Barre de filtres chips et bouton d'actualisation */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setFiltre("tous")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    filtre === "tous"
                      ? "bg-[#0a2d26] dark:bg-emerald-600 text-white shadow-sm"
                      : "bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Toutes ({total})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltre("admis")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    filtre === "admis"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Admis ({nbAdmis})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltre("en_attente")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    filtre === "en_attente"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  En attente ({nbEnAttente})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltre("refuse")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    filtre === "refuse"
                      ? "bg-slate-700 text-white shadow-sm"
                      : "bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Non retenu ({nbRefuses})
                </button>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-emerald-500/50 transition shrink-0 cursor-pointer disabled:opacity-50"
                title="Actualiser la liste"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
            </div>

            {/* Liste des candidatures */}
            {loading ? (
              <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 text-center border border-slate-200 dark:border-slate-800 shadow-xl">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Chargement de vos dossiers...
                </p>
              </div>
            ) : filtrates.length === 0 ? (
              <div className="p-10 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-800/60 shadow-inner">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {candidatures.length === 0
                      ? "Aucune candidature enregistrée"
                      : "Aucun dossier pour ce filtre"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                    {candidatures.length === 0
                      ? "Vous n'avez pas encore déposé de candidature aux bourses. Découvrez les opportunités actuelles."
                      : "Aucun dossier ne correspond au filtre sélectionné. Essayez d'afficher toutes vos candidatures."}
                  </p>
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition"
                >
                  <span>Découvrir les bourses disponibles</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filtrates.map((c) => {
                  const estAdmis = c.statut === "admis";
                  const estEnAttente =
                    c.statut === "en_attente" || !c.statut;
                  const estRefuse = c.statut === "refuse";
                  const isExpanded = expandedId === c.id;

                  const titre =
                    c.bourse?.titre ||
                    c.bourse?.formation?.titre ||
                    "Bourse Sahel Academy";

                  return (
                    <div
                      key={c.id}
                      className={`overflow-hidden rounded-3xl border transition-all shadow-md ${
                        estAdmis
                          ? "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700/60 shadow-emerald-950/5"
                          : estEnAttente
                          ? "bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700/60 shadow-amber-950/5"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {/* En-tête de carte */}
                      <div className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5">
                            {/* Icône de statut */}
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                                estAdmis
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : estEnAttente
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {estAdmis ? (
                                <CheckCircle2 className="w-6 h-6" />
                              ) : estEnAttente ? (
                                <Clock className="w-6 h-6" />
                              ) : (
                                <AlertCircle className="w-6 h-6" />
                              )}
                            </div>

                            <div>
                              <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                                {titre}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>Candidat : {c.nom || user.nom}</span>
                              </p>
                            </div>
                          </div>

                          {/* Badge de Statut Pill */}
                          <span
                            className={`shrink-0 px-3 py-1 rounded-full font-bold text-xs ${
                              estAdmis
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                : estEnAttente
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                            }`}
                          >
                            {estAdmis
                              ? "Admis(e)"
                              : estEnAttente
                              ? "En attente d'examen"
                              : "Non retenu"}
                          </span>
                        </div>

                        {/* Bloc d'admission (si retenu) */}
                        {estAdmis && (
                          <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-sm">
                              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Félicitations ! Votre candidature est validée.</span>
                            </div>

                            {c.bourse?.messageAdmission && (
                              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed pl-3 border-l-2 border-emerald-500/40">
                                {c.bourse.messageAdmission}
                              </p>
                            )}

                            {c.bourse?.documentAdmissionUrl && (
                              <a
                                href={c.bourse.documentAdmissionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition"
                              >
                                <Download className="w-4 h-4" />
                                <span>
                                  {c.bourse.documentAdmissionNom ||
                                    "Télécharger le document d'admission"}
                                </span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Message informatif en attente */}
                        {estEnAttente && (
                          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                              Votre dossier a bien été reçu et est actuellement examiné par notre commission d&apos;attribution. Vous serez notifié de la décision finale.
                            </p>
                          </div>
                        )}

                        {/* Message non retenu */}
                        {estRefuse && (
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                              Votre dossier n&apos;a pas été retenu pour cette bourse. De nouvelles bourses et sessions de formation sont régulièrement publiées sur la plateforme.
                            </p>
                          </div>
                        )}

                        {/* Réponses au formulaire (accordéon) */}
                        {c.reponses && Object.keys(c.reponses).length > 0 && (
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId(isExpanded ? null : c.id)
                              }
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer"
                            >
                              <span>
                                {isExpanded
                                  ? "Masquer les détails du dossier"
                                  : "Voir les réponses fournies"}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                                  Détails de la soumission :
                                </h4>
                                {Object.entries(c.reponses).map(
                                  ([cle, val]) => (
                                    <div
                                      key={cle}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40 last:border-none gap-1"
                                    >
                                      <span className="font-medium text-slate-500 dark:text-slate-400 capitalize">
                                        {cle.replace(/_/g, " ")} :
                                      </span>
                                      <span className="font-bold text-slate-800 dark:text-slate-200 break-all">
                                        {typeof val === "boolean"
                                          ? val
                                            ? "Oui"
                                            : "Non"
                                          : String(val || "—")}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pied de carte */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Déposé le :{" "}
                              <strong className="text-slate-700 dark:text-slate-300">
                                {formatDate(c.dateDepot || c.createdAt)}
                              </strong>
                            </span>
                          </span>

                          {c.bourseId && (
                            <Link
                              href={`/bourses/${c.bourseId}`}
                              className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              <span>Voir la bourse</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <p className="text-center text-xs text-emerald-100/90 drop-shadow-sm font-medium pt-4">
          © {new Date().getFullYear()} Sahel Academy. Tous droits réservés.
        </p>
      </div>
    </main>
  );
}
