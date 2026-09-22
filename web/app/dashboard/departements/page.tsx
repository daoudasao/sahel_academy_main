"use client";

import { useState, useEffect, Fragment } from "react";
import InfoBanner from "@/app/components/InfoBanner";
import { departementsApi, formationsApi } from "@/app/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Folder,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  BookOpen,
  Layers,
  Sparkles,
  Loader2,
  CheckCircle2,
  X,
  LayoutGrid,
  Users,
} from "lucide-react";

export default function DepartementsPage() {
  const [departementsList, setDepartementsList] = useState<any[]>([]);
  const [formationsList, setFormationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal / Inline Add State
  const [isAdding, setIsAdding] = useState(false);
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newDeptNom, setNewDeptNom] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDeptNom, setEditDeptNom] = useState("");
  const [editDeptDesc, setEditDeptDesc] = useState("");

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [depts, forms] = await Promise.all([departementsApi.list(), formationsApi.list()]);
        setDepartementsList(depts || []);
        setFormationsList(forms || []);
      } catch (err) {
        console.error("Erreur chargement départements", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filtered = departementsList.filter((d) =>
    (d.nom || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newDeptNom.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await departementsApi.create({
        nom: newDeptNom.trim(),
        description: newDeptDesc.trim() || undefined,
      });
      setDepartementsList((prev) => [...prev, created]);
      setNewDeptNom("");
      setNewDeptDesc("");
      setIsAdding(false);
      setShowInlineAdd(false);
      triggerToast("Département créé avec succès !");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (d: any) => {
    setEditingId(d.id);
    setEditDeptNom(d.nom);
    setEditDeptDesc(d.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editDeptNom.trim() || !editingId || submitting) return;
    setSubmitting(true);
    try {
      const updated = await departementsApi.update(editingId, {
        nom: editDeptNom.trim(),
        description: editDeptDesc.trim() || undefined,
      });
      setDepartementsList((prev) =>
        prev.map((d) => (d.id === editingId ? { ...d, ...updated } : d))
      );
      setEditingId(null);
      triggerToast("Département mis à jour !");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId || submitting) return;
    setSubmitting(true);
    try {
      await departementsApi.remove(deletingId);
      setDepartementsList((prev) => prev.filter((d) => d.id !== deletingId));
      setDeletingId(null);
      triggerToast("Département supprimé.");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalFormations = formationsList.length;

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-[#0a2d26] text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-emerald-500/30 animate-in slide-in-from-bottom-5 duration-300 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Compact Green Header */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <Sparkles className="w-3 h-3" />
              <span>Pôles académiques & centres</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Gestion des Départements
            </h1>
            <p className="text-xs text-emerald-100/75 leading-relaxed">
              Organisez et structurez vos programmes d'enseignement.
            </p>
          </div>

          <div className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <button
              onClick={() => setShowInlineAdd(!showInlineAdd)}
              className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 backdrop-blur-md"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-300" />
              <span>{showInlineAdd ? "Fermer" : "Création rapide"}</span>
            </button>
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingId(null);
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0a2d26] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Nouveau département</span>
            </button>
          </div>
        </div>

        {/* Compact Stat Bar */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <Folder className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Départements:</span>
            <span className="font-bold text-white">{departementsList.length}</span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <BookOpen className="w-4 h-4 text-indigo-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Formations:</span>
            <span className="font-bold text-white">{totalFormations}</span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <LayoutGrid className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Visibles:</span>
            <span className="font-bold text-white">{filtered.length}</span>
          </div>
        </div>
      </div>

      <InfoBanner>
        <strong>Pôles d'expertise :</strong> Les départements regroupent les cours et formations par domaine. Ils s'adaptent instantanément à la recherche.
      </InfoBanner>

      {/* Formulaire de création rapide Inline (Toute la largeur) */}
      {showInlineAdd && (
        <div className="w-full bg-white rounded-2xl border-2 border-emerald-500/30 p-5 sm:p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Créer un département en ligne
              </h2>
            </div>
            <button
              onClick={() => setShowInlineAdd(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nom du département <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all"
                placeholder="Ex: Informatique & IA"
                value={newDeptNom}
                onChange={(e) => setNewDeptNom(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Description synthétique
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all"
                placeholder="Ex: Pôle de formation professionnelle axé sur les technologies numériques..."
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end items-center gap-3 mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                setShowInlineAdd(false);
                setNewDeptNom("");
                setNewDeptDesc("");
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors"
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              onClick={handleAdd}
              disabled={!newDeptNom.trim() || submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] text-white text-sm font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Création en cours...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Ajouter le département</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Barre de Recherche et Filtres (Full Width) */}
      <div className="w-full flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou description..."
            className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-50 sm:bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26]/20 focus:border-[#0a2d26] transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
            {filtered.length} {filtered.length > 1 ? "résultats" : "résultat"}
          </span>
        </div>
      </div>

      {/* Tableau des départements - Pleine largeur responsive */}
      {filtered.length === 0 ? (
        <div className="w-full text-center py-16 bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <Folder className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {loading ? "Chargement des données..." : "Aucun département trouvé"}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {loading
              ? "Veuillez patienter pendant la récupération des pôles..."
              : "Aucun pôle ne correspond à votre recherche. Vous pouvez créer un nouveau département dès maintenant."}
          </p>
          {!loading && (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a2d26] text-white text-sm font-semibold hover:bg-[#0d3b32] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Créer un département
            </button>
          )}
        </div>
      ) : (
        <div className="table-responsive bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">Département</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Formations</th>
                <th className="py-3.5 px-4 text-right">Actions Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((d) => {
                const deptFormations = formationsList.filter((f) => f.departementId === d.id);
                const count = deptFormations.length;
                const isExpanded = expandedDeptId === d.id;

                return (
                  <Fragment key={d.id}>
                    <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? "bg-slate-50/60" : ""}`}>
                      {/* Nom & Icône */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0a2d26] via-[#0d3b32] to-[#124b40] text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
                            <Folder className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{d.nom}</div>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs sm:max-w-md">
                        <p className="line-clamp-2 leading-relaxed">
                          {d.description || "Aucune description renseignée pour ce département."}
                        </p>
                      </td>

                      {/* Formations associées */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setExpandedDeptId(isExpanded ? null : d.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            isExpanded
                              ? "bg-[#0a2d26] text-white border-[#0a2d26] shadow-xs"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          }`}
                          title={isExpanded ? "Masquer les formations" : "Voir les formations rattachées"}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{count} formation{count > 1 ? "s" : ""}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180 text-emerald-300" : "text-emerald-600"}`} />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition cursor-pointer"
                            onClick={() => handleStartEdit(d)}
                            title="Modifier ce département"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Modifier</span>
                          </button>
                          <button
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs transition cursor-pointer"
                            onClick={() => setDeletingId(d.id)}
                            title="Supprimer ce département"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Ligne accordéon des formations rattachées */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 border-b border-slate-200/60">
                        <td colSpan={4} className="px-6 py-4">
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-emerald-600" />
                                <span>Formations du département &ldquo;{d.nom}&rdquo; ({count})</span>
                              </h4>
                              <button
                                onClick={() => setExpandedDeptId(null)}
                                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                              >
                                Masquer
                              </button>
                            </div>

                            {count > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {deptFormations.map((f) => (
                                  <div
                                    key={f.id}
                                    className="flex justify-between items-center bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 hover:border-emerald-300 transition-colors"
                                  >
                                    <div className="min-w-0 pr-2">
                                      <div className="text-xs font-bold text-slate-800 truncate">
                                        {f.titre}
                                      </div>
                                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                        Formateur : <strong className="text-slate-700">{f.formateur?.nom ?? "Non assigné"}</strong>
                                      </div>
                                    </div>
                                    <span
                                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                                        f.niveau === "Débutant"
                                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                          : f.niveau === "Intermédiaire"
                                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                                          : "bg-rose-100 text-rose-700 border border-rose-200"
                                      }`}
                                    >
                                      {f.niveau || "Standard"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                Aucune formation rattachée à ce département pour le moment.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ajout - Design responsive mobile & desktop */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              Nouveau Département
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-500 pt-1">
              Créez un nouveau pôle d'enseignement pour structurer les formations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nom du département <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                placeholder="Ex: Génie Logiciel & Data"
                value={newDeptNom}
                onChange={(e) => setNewDeptNom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Description
              </label>
              <textarea
                className="w-full min-h-[90px] rounded-xl border border-slate-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26] resize-y"
                placeholder="Décrivez brièvement les objectifs de ce département..."
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              className="w-full sm:w-auto h-11 px-5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              onClick={() => setIsAdding(false)}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-semibold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={handleAdd}
              disabled={!newDeptNom.trim() || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Création...</span>
                </>
              ) : (
                <span>Créer le département</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Modification */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Edit2 className="w-4 h-4" />
              </div>
              Modifier le Département
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-500 pt-1">
              Mettez à jour les détails de ce pôle d'enseignement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nom du département <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                value={editDeptNom}
                onChange={(e) => setEditDeptNom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Description
              </label>
              <textarea
                className="w-full min-h-[90px] rounded-xl border border-slate-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26] resize-y"
                value={editDeptDesc}
                onChange={(e) => setEditDeptDesc(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              className="w-full sm:w-auto h-11 px-5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              onClick={() => setEditingId(null)}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-semibold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={handleSaveEdit}
              disabled={!editDeptNom.trim() || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>Enregistrer</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Suppression */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[425px] rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              Supprimer le département
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-600 pt-2 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer ce pôle ?<br />
              Cette action est <strong className="text-red-600">irréversible</strong> et pourra désorganiser l'association des formations rattachées.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 mt-2">
            <button
              className="w-full sm:w-auto h-11 px-5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              onClick={() => setDeletingId(null)}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={handleConfirmDelete}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Suppression...</span>
                </>
              ) : (
                <span>Oui, supprimer</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
