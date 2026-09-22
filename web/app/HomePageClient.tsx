"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bourse, Formation, fetchBourses, fetchFormations } from "@/lib/api";
import { GraduationCap, Calendar, ArrowRight, Sparkles, Smartphone, RefreshCw, BookOpen, Clock, Wallet, ClipboardList } from "lucide-react";

interface HomePageClientProps {
  initialBourses: Bourse[];
  initialFormations: Formation[];
}

type Onglet = "bourses" | "formations";

const formatFCFA = (n: number) => `${(n || 0).toLocaleString("fr-FR")} FCFA`;

export default function HomePageClient({
  initialBourses,
  initialFormations,
}: HomePageClientProps) {
  const [activeTab, setActiveTab] = useState<Onglet>("bourses");
  const [bourses, setBourses] = useState<Bourse[]>(initialBourses);
  const [formations, setFormations] = useState<Formation[]>(initialFormations);
  // Un rafraîchissement client part dès le montage : on démarre donc en
  // chargement plutôt que de basculer l'état depuis l'effet.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBourses(), fetchFormations()])
      .then(([lesBourses, lesFormations]) => {
        if (lesBourses && lesBourses.length > 0) {
          setBourses(lesBourses);
        }
        if (lesFormations && lesFormations.length > 0) {
          setFormations(lesFormations);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dStr: string) => {
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

  return (
    <main className="portal-bg min-h-screen py-10 px-4 flex flex-col items-center justify-start relative z-10">
      <div className="w-full max-w-xl space-y-6">
        {/* Main Card Header */}
        <div className="overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-xl shadow-emerald-900/5 ring-1 ring-slate-200/80 dark:ring-slate-800">
          <div className="bg-gradient-to-br from-[#0a2d26] via-[#0d3b32] to-[#124b40] px-6 pt-8 pb-9 text-center relative">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
            <Image
              src="/logo_large.png"
              alt="Sahel Academy"
              width={220}
              height={60}
              priority
              className="mx-auto mb-3 h-auto w-[220px]"
            />
            <p className="mt-2 text-xs sm:text-sm text-emerald-100/90 font-medium">
              Plateforme officielle de recrutement &amp; vérification de bourses d&apos;études
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 p-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("bourses")}
              className={`flex-1 py-3 px-2 sm:px-4 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "bourses"
                  ? "bg-white dark:bg-slate-800 text-emerald-950 dark:text-emerald-300 shadow-md shadow-slate-200 dark:shadow-none"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Bourses ({bourses.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("formations")}
              className={`flex-1 py-3 px-2 sm:px-4 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "formations"
                  ? "bg-white dark:bg-slate-800 text-emerald-950 dark:text-emerald-300 shadow-md shadow-slate-200 dark:shadow-none"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Formations ({formations.length})</span>
            </button>
          </div>

          {/* Tab 1: Available Bourses */}
          {activeTab === "bourses" && (
            <div className="p-6 space-y-4">
              {loading && bourses.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">Chargement des bourses depuis le serveur...</h4>
                </div>
              ) : bourses.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <GraduationCap className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">Aucune bourse ouverte actuellement</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Revenez plus tard pour découvrir les nouvelles offres de bourses disponibles.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bourses.map((b) => (
                    <div
                      key={b.id}
                      className="group p-5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {b.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.imageUrl} alt={b.titre} className="w-full h-full object-cover" />
                          ) : (
                            <GraduationCap className="w-6 h-6 text-emerald-700" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-emerald-800 transition-colors">
                              {b.titre}
                            </h3>
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                b.statut === "fermee"
                                  ? "bg-slate-100 text-slate-700 border border-slate-200"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {b.statut === "fermee" ? "Fermée" : "Ouverte"}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                            {b.description || "Aucune description renseignée."}
                          </p>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              Limite : <strong className="text-red-600">{formatDate(b.dateLimite)}</strong>
                            </span>

                            <Link
                              href={`/bourses/${b.id}`}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-sm transition-all ${
                                b.statut === "fermee"
                                  ? "bg-slate-700 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                                  : "bg-[#0a2d26] hover:bg-[#0d3b32] dark:bg-emerald-700 dark:hover:bg-emerald-600 dark:border dark:border-emerald-500/30"
                              }`}
                            >
                              <span>{b.statut === "fermee" ? "Consulter" : "Voir & Postuler"}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-emerald-300" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Formations (inscription aux cours) */}
          {activeTab === "formations" && (
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Inscrivez-vous directement à l&apos;un de nos cours. Votre demande
                est transmise à l&apos;administration, qui vous contacte pour
                finaliser les modalités.
              </p>

              {loading && formations.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">Chargement des formations depuis le serveur...</h4>
                </div>
              ) : formations.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">Aucune formation ouverte actuellement</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Revenez plus tard pour découvrir les prochaines sessions de cours.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formations.map((f) => (
                    <div
                      key={f.id}
                      className="group p-5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {f.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={f.imageUrl} alt={f.titre} className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen className="w-6 h-6 text-emerald-700" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-emerald-800 transition-colors">
                              {f.titre}
                            </h3>
                            {f.estBourse && (
                              <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                Bourse possible
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                            {f.description || "Aucune description renseignée."}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {f.dureeMois} mois
                            </span>
                            <span className="flex items-center gap-1">
                              <Wallet className="w-3.5 h-3.5 text-slate-400" />
                              {f.prixMensualite > 0 ? `${formatFCFA(f.prixMensualite)} / mois` : "Gratuit"}
                            </span>
                            {f.niveau && (
                              <span className="flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                                {f.niveau}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-end mt-3 pt-3 border-t border-slate-100">
                            <Link
                              href={`/formations/${f.id}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] dark:bg-emerald-700 dark:hover:bg-emerald-600 dark:border dark:border-emerald-500/30 text-white text-xs font-bold shadow-sm transition-all"
                            >
                              <span>Voir &amp; S&apos;inscrire</span>
                              <ArrowRight className="w-3.5 h-3.5 text-emerald-300" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick link to Mes candidatures */}
        <Link
          href="/candidatures"
          className="p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-lg flex items-center justify-between gap-3 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/60 shadow-xs">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                <span>Suivi de mes candidatures</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold">
                  Espace candidat
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Consultez vos dossiers soumis, statuts et résultats d&apos;admission
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>

        {/* Footer info banner */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-800 shadow-lg flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-emerald-800 dark:text-emerald-400 shrink-0" />
          <div className="text-xs text-slate-800 dark:text-slate-200">
            <span className="font-bold text-emerald-950 dark:text-emerald-300">Application mobile Sahel Academy : </span>
            <span className="text-slate-700 dark:text-slate-300">
              Téléchargez l&apos;application pour suivre vos résultats et accéder à tous vos cours en direct.
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-emerald-100/90 drop-shadow-sm font-medium">© {new Date().getFullYear()} Sahel Academy. Tous droits réservés.</p>
      </div>
    </main>
  );
}
