"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatDate } from "@/app/lib/mock-data";
import { boursesApi } from "@/app/lib/api";
import {
  Calendar,
  GraduationCap,
  Users,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Edit2,
  Sparkles,
  RefreshCw,
  XCircle,
  ChevronDown,
  AlertTriangle,
  Check,
  Copy,
  Link2,
  Trash2,
} from "lucide-react";
import InfoBanner from "@/app/components/InfoBanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";

export default function BoursesPage() {
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [boursesList, setBoursesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (bourseId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const verifBaseUrl = (process.env.NEXT_PUBLIC_VERIF_URL || origin).replace(/\/$/, "");
    const url = verifBaseUrl ? `${verifBaseUrl}/bourses/${bourseId}` : `/bourses/${bourseId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(bourseId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Menu déroulant de statut actif
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; openUpwards: boolean } | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const handleToggleDropdown = (e: React.MouseEvent<HTMLButtonElement>, bourseId: string) => {
    e.stopPropagation();
    if (activeDropdownId === bourseId) {
      setActiveDropdownId(null);
      setDropdownPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpwards = spaceBelow < 220;

      setDropdownPos({
        top: openUpwards ? rect.top : rect.bottom,
        left: rect.left,
        openUpwards,
      });
      setActiveDropdownId(bourseId);
    }
  };

  // Fermer le dropdown lors d'un clic à l'extérieur ou scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };
    const handleScrollOrResize = () => {
      setActiveDropdownId(null);
      setDropdownPos(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, []);

  // Modal confirmation publication
  const [confirmPublishModal, setConfirmPublishModal] = useState<{ open: boolean; bourseId: string; bourseTitre: string }>({
    open: false,
    bourseId: "",
    bourseTitre: "",
  });
  const [publishing, setPublishing] = useState(false);

  // Modal confirmation changement de statut
  const [statusModal, setStatusModal] = useState<{ open: boolean; bourseId: string; bourseTitre: string; currentStatut: string }>({
    open: false,
    bourseId: "",
    bourseTitre: "",
    currentStatut: "",
  });
  const [newStatut, setNewStatut] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Modal confirmation suppression bourse
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; bourseId: string; bourseTitre: string }>({
    open: false,
    bourseId: "",
    bourseTitre: "",
  });
  const [deleting, setDeleting] = useState(false);

  const handleDeleteBourse = async () => {
    if (!deleteModal.bourseId || deleting) return;
    setDeleting(true);
    try {
      await boursesApi.remove(deleteModal.bourseId);
      setBoursesList((prev) => prev.filter((b) => b.id !== deleteModal.bourseId));
      setDeleteModal({ open: false, bourseId: "", bourseTitre: "" });
    } catch (err) {
      console.error("Erreur suppression bourse:", err);
      alert("Erreur lors de la suppression de la bourse.");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateStatut = async () => {
    if (!statusModal.bourseId || !newStatut || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await boursesApi.update(statusModal.bourseId, { statut: newStatut });
      setBoursesList((prev) =>
        prev.map((b) => (b.id === statusModal.bourseId ? { ...b, statut: newStatut } : b))
      );
      setStatusModal({ open: false, bourseId: "", bourseTitre: "", currentStatut: "" });
      setNewStatut("");
    } catch (err) {
      console.error("Erreur changement statut bourse:", err);
      alert("Erreur lors du changement de statut.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const fetchBourses = async () => {
    try {
      setLoading(true);
      const data = await boursesApi.list();
      setBoursesList(data || []);
    } catch (err) {
      console.error("Erreur lors du chargement des bourses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBourses();
  }, []);

  const handleConfirmBourse = async () => {
    if (!confirmPublishModal.bourseId || publishing) return;
    setPublishing(true);
    try {
      await boursesApi.update(confirmPublishModal.bourseId, { statut: "ouverte" });
      setBoursesList((prev) =>
        prev.map((b) => (b.id === confirmPublishModal.bourseId ? { ...b, statut: "ouverte" } : b))
      );
      setConfirmPublishModal({ open: false, bourseId: "", bourseTitre: "" });
    } catch (err) {
      console.error("Erreur publication bourse:", err);
      alert("Erreur lors de la publication de la bourse.");
    } finally {
      setPublishing(false);
    }
  };

  const filtered = boursesList.filter((b) => {
    const matchSearch =
      b.titre.toLowerCase().includes(search.toLowerCase()) ||
      (b.description || "").toLowerCase().includes(search.toLowerCase());
    const matchStatut = !statutFilter || b.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  const nbCandidatures = (b: any) => b._count?.candidatures ?? b.nombreCandidatures ?? 0;
  const nbChamps = (b: any) => b._count?.champs ?? (Array.isArray(b.champs) ? b.champs.length : 0);

  const totalBourses = boursesList.length;
  const ouvertesCount = boursesList.filter((b) => b.statut === "ouverte").length;
  const enAttenteCount = boursesList.filter((b) => b.statut === "en_attente").length;
  const totalCandidatures = boursesList.reduce((s, b) => s + nbCandidatures(b), 0);

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Compact Green Header */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <Sparkles className="w-3 h-3" />
              <span>Programmes d&apos;Aide</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Bourses d&apos;Études
            </h1>
            <p className="text-xs text-emerald-100/75 leading-relaxed">
              Consultez et administrez les opportunités de bourse et les candidatures.
            </p>
          </div>

          <div className="w-full sm:w-auto">
            <Link
              href="/dashboard/bourses/nouveau"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0a2d26] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              + Nouvelle bourse
            </Link>
          </div>
        </div>

        {/* Compact Stat Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <GraduationCap className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Bourses:</span>
            <span className="font-bold text-white">{totalBourses}</span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Ouvertes:</span>
            <span className="font-bold text-white">{ouvertesCount}</span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <Clock className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">En attente:</span>
            <span className="font-bold text-white">{enAttenteCount}</span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <Users className="w-4 h-4 text-indigo-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Candidats:</span>
            <span className="font-bold text-white">{totalCandidatures}</span>
          </div>
        </div>
      </div>

      <InfoBanner>
        <strong>Objectif :</strong> Créer et administrer les offres de bourses d&apos;études.<br />
        <strong>Processus :</strong> Lors de la création, la bourse passe au statut <em>&quot;En attente&quot;</em>. L&apos;administrateur doit la <strong>confirmer &amp; publier</strong> pour l&apos;ouvrir officiellement aux étudiants.
      </InfoBanner>

      {/* Barre de Recherche et Filtres */}
      <div className="w-full flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une bourse..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 sm:bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26]/20 focus:border-[#0a2d26] transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            className="w-full sm:w-auto h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="ouverte">Ouverte</option>
            <option value="en_attente">En attente</option>
            <option value="fermee">Fermée</option>
          </select>
        </div>
      </div>

      {/* Tableau des bourses */}
      {filtered.length === 0 ? (
        <div className="w-full text-center py-16 bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {loading ? "Chargement des bourses..." : "Aucune bourse trouvée"}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {loading
              ? "Veuillez patienter pendant la récupération des bourses..."
              : "Aucune offre de bourse ne correspond à vos critères."}
          </p>
          {!loading && (
            <Link
              href="/dashboard/bourses/nouveau"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a2d26] text-white text-sm font-semibold hover:bg-[#0d3b32] transition-colors"
            >
              + Créer une bourse
            </Link>
          )}
        </div>
      ) : (
        <div className="table-responsive bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">Bourse</th>
                <th className="py-3.5 px-4">Dates</th>
                <th className="py-3.5 px-4">Candidats &amp; Champs</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((b) => {
                const isOpen = b.statut === "ouverte";
                const isPending = b.statut === "en_attente";
                const candidatsCount = nbCandidatures(b);
                const champsCount = nbChamps(b);

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Bourse Titre & Description */}
                    <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 shrink-0 overflow-hidden flex items-center justify-center">
                          {b.imageUrl || b.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.imageUrl || b.image} alt={b.titre} className="w-full h-full object-cover" />
                          ) : (
                            <GraduationCap className="w-5 h-5 text-emerald-700" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{b.titre}</div>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {b.description || "Aucune description renseignée."}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Publiée : <strong className="text-slate-700">{formatDate(b.datePublication)}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>Limite : <strong className="text-red-600">{formatDate(b.dateLimite)}</strong></span>
                      </div>
                    </td>

                    {/* Candidats & Champs */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/bourses/${b.id}/candidatures`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs transition"
                          title="Voir les candidats ayant postulé"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{candidatsCount} candidat{candidatsCount > 1 ? "s" : ""}</span>
                        </Link>

                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium text-xs">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>{champsCount} champs</span>
                        </span>
                      </div>
                    </td>

                    {/* Statut avec Menu Déroulant */}
                    <td className="py-3.5 px-4">
                      <div className="relative inline-block text-left" ref={b.id === activeDropdownId ? dropdownRef : null}>
                        <button
                          onClick={(e) => handleToggleDropdown(e, b.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer hover:shadow-xs ${
                            isOpen
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : isPending
                              ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          }`}
                          title="Cliquer pour changer le statut"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{isOpen ? "Ouverte" : isPending ? "En attente" : "Fermée"}</span>
                          <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${activeDropdownId === b.id ? "rotate-180" : ""}`} />
                        </button>

                        {activeDropdownId === b.id && dropdownPos && (
                          <div
                            style={{
                              position: "fixed",
                              top: dropdownPos.openUpwards ? "auto" : `${dropdownPos.top + 6}px`,
                              bottom: dropdownPos.openUpwards ? `${window.innerHeight - dropdownPos.top + 6}px` : "auto",
                              left: `${dropdownPos.left}px`,
                            }}
                            className="w-60 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] p-1.5 space-y-1 text-left animate-in fade-in zoom-in-95 duration-100"
                          >
                            <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Changer le statut
                            </div>
                            {[
                              { value: "ouverte", label: "Ouverte", desc: "Visible et ouverte aux candidatures", dot: "bg-emerald-500" },
                              { value: "fermee",  label: "Fermée",  desc: "Clôturée, plus de candidatures",     dot: "bg-slate-500" },
                            ].map((opt) => {
                              const isCurrent = b.statut === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    if (!isCurrent) {
                                      setStatusModal({ open: true, bourseId: b.id, bourseTitre: b.titre, currentStatut: b.statut });
                                      setNewStatut(opt.value);
                                    }
                                  }}
                                  className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-xs transition cursor-pointer text-left ${
                                    isCurrent
                                      ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                                      : "hover:bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${opt.dot}`} />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">{opt.label}</span>
                                      {isCurrent && <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">Actuel</span>}
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">{opt.desc}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        {isPending && (
                          <button
                            onClick={() => setConfirmPublishModal({ open: true, bourseId: b.id, bourseTitre: b.titre })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition"
                            title="Publier cette offre de bourse"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Publier
                          </button>
                        )}

                        <Link
                          href={`/dashboard/bourses/${b.id}/modifier`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
                          title="Modifier la bourse"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleCopyLink(b.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                            copiedId === b.id
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          }`}
                          title="Copier le lien d'accès sur le site de vérification"
                        >
                          {copiedId === b.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Lien copié !</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copier lien verif</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteModal({ open: true, bourseId: b.id, bourseTitre: b.titre })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition cursor-pointer"
                          title="Supprimer définitivement cette bourse"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal confirmation publication */}
      <Dialog
        open={confirmPublishModal.open}
        onOpenChange={(open) => {
          if (!open && !publishing) {
            setConfirmPublishModal({ open: false, bourseId: "", bourseTitre: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0a2d26] text-lg font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Confirmer la publication
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-slate-600 leading-relaxed">
              Voulez-vous vraiment ouvrir officiellement la bourse <strong>&ldquo;{confirmPublishModal.bourseTitre}&rdquo;</strong> aux candidatures des étudiants ?<br />
              <span className="text-emerald-700 text-xs mt-2 block font-medium">
                ✓ Les étudiants pourront directement postuler depuis l&apos;application mobile.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2 border-t mt-3">
            <button
              className="w-full sm:w-auto h-10 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              onClick={() => setConfirmPublishModal({ open: false, bourseId: "", bourseTitre: "" })}
              disabled={publishing}
            >
              Annuler
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
              onClick={handleConfirmBourse}
              disabled={publishing}
            >
              {publishing ? "Publication..." : "Confirmer & Publier"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal confirmation changement de statut */}
      <Dialog
        open={statusModal.open}
        onOpenChange={(open) => {
          if (!open && !updatingStatus) {
            setStatusModal({ open: false, bourseId: "", bourseTitre: "", currentStatut: "" });
            setNewStatut("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0a2d26] text-lg font-bold">
              <RefreshCw className={`w-5 h-5 text-emerald-600 ${updatingStatus ? "animate-spin" : ""}`} />
              Confirmer le changement de statut
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-600">
              Vous allez modifier le statut de la bourse <strong>&ldquo;{statusModal.bourseTitre}&rdquo;</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Visualization comparing old vs new status */}
          <div className="my-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Passage de statut</div>
            
            <div className="flex items-center justify-between gap-3">
              {/* Old status badge */}
              <div className="flex-1 p-2.5 rounded-lg border bg-white text-center shadow-2xs">
                <span className="text-[11px] text-slate-400 block font-medium">Statut Actuel</span>
                <span className="font-bold text-xs text-slate-700 capitalize">
                  {statusModal.currentStatut === "ouverte" ? "Ouverte" : statusModal.currentStatut === "en_attente" ? "En attente" : "Fermée"}
                </span>
              </div>

              <span className="text-slate-400 font-bold text-lg">➔</span>

              {/* New status badge */}
              <div className={`flex-1 p-2.5 rounded-lg border text-center shadow-2xs font-bold text-xs ${
                newStatut === "ouverte"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : newStatut === "en_attente"
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-slate-100 text-slate-800 border-slate-300"
              }`}>
                <span className="text-[11px] opacity-75 block font-medium">Nouveau Statut</span>
                <span>
                  {newStatut === "ouverte" ? "Ouverte" : newStatut === "en_attente" ? "En attente" : "Fermée"}
                </span>
              </div>
            </div>

            {/* Explanatory notice */}
            <div className="text-xs text-slate-600 pt-1 leading-relaxed border-t border-slate-200/60">
              {newStatut === "ouverte" && (
                <p className="text-emerald-700 flex items-start gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>La bourse sera immédiatement visible par tous les étudiants qui pourront poser leur candidature.</span>
                </p>
              )}
              {newStatut === "fermee" && (
                <p className="text-slate-700 flex items-start gap-1.5 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>La bourse sera clôturée. Plus aucun étudiant ne pourra soumettre de nouvelle candidature.</span>
                </p>
              )}
              {newStatut === "en_attente" && (
                <p className="text-amber-800 flex items-start gap-1.5 font-medium">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>La bourse repassera en attente de validation et sera masquée des offres publiques.</span>
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2 border-t">
            <button
              className="w-full sm:w-auto h-10 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              onClick={() => {
                setStatusModal({ open: false, bourseId: "", bourseTitre: "", currentStatut: "" });
                setNewStatut("");
              }}
              disabled={updatingStatus}
            >
              Annuler
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              onClick={handleUpdateStatut}
              disabled={updatingStatus || !newStatut || newStatut === statusModal.currentStatut}
            >
              {updatingStatus ? "Mise à jour..." : "Confirmer le statut"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal confirmation suppression définitive bourse */}
      <Dialog
        open={deleteModal.open}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteModal({ open: false, bourseId: "", bourseTitre: "" });
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Supprimer la bourse
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed pt-1">
              Êtes-vous sûr de vouloir supprimer définitivement l&apos;offre de bourse &quot;<strong>{deleteModal.bourseTitre}</strong>&quot; ?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl text-xs text-rose-800 space-y-1 my-2">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Action irréversible</span>
            </p>
            <p className="text-[11px] text-rose-700 leading-normal pl-5.5">
              Toutes les candidatures reçues ainsi que la configuration des champs du formulaire associés à cette bourse seront également supprimées de la base de données.
            </p>
          </div>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2 border-t">
            <button
              className="w-full sm:w-auto h-10 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              onClick={() => setDeleteModal({ open: false, bourseId: "", bourseTitre: "" })}
              disabled={deleting}
            >
              Annuler
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              onClick={handleDeleteBourse}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Suppression...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmer la suppression</span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
