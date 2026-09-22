"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import InfoBanner from "@/app/components/InfoBanner";
import { formatFCFA } from "@/app/lib/mock-data";
import { formationsApi, departementsApi } from "@/app/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Sparkles,
  Users,
  Layers,
  CheckCircle2,
  XCircle,
  X,
  GraduationCap,
  Eye,
} from "lucide-react";

type Statut = "active" | "inactive" | "archive";

export default function FormationsPage() {
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterNiveau, setFilterNiveau] = useState("");

  const [formationsList, setFormationsList] = useState<any[]>([]);
  const [departements, setDepartements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Submissions
  const [statusConfirm, setStatusConfirm] = useState<{ id: string; newStatut: Statut } | null>(null);
  const [deletingFormationId, setDeletingFormationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [forms, depts] = await Promise.all([formationsApi.list(), departementsApi.list()]);
        setFormationsList(forms || []);
        setDepartements(depts || []);
      } catch (err) {
        console.error("Erreur chargement formations", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const inscritsDe = (f: any) => f._count?.inscriptions ?? f.inscrits ?? 0;

  const confirmStatusChange = async () => {
    if (!statusConfirm || submitting) return;
    setSubmitting(true);
    try {
      const { id, newStatut } = statusConfirm;
      await formationsApi.update(id, { statut: newStatut });
      setFormationsList((prev) =>
        prev.map((f) => (f.id === id ? { ...f, statut: newStatut } : f))
      );
      setStatusConfirm(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingFormationId || submitting) return;
    setSubmitting(true);
    try {
      await formationsApi.remove(deletingFormationId);
      setFormationsList((prev) => prev.filter((f) => f.id !== deletingFormationId));
      setDeletingFormationId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = formationsList.filter((f) => {
    if (f.estBourse) return false;
    const matchSearch =
      (f.titre || "").toLowerCase().includes(search.toLowerCase()) ||
      (f.formateur?.nom || "").toLowerCase().includes(search.toLowerCase());
    const matchDept = !filterDept || f.departementId === filterDept;
    const matchNiveau = !filterNiveau || f.niveau === filterNiveau;
    return matchSearch && matchDept && matchNiveau;
  });

  const totalInscrits = formationsList.reduce((acc, f) => acc + inscritsDe(f), 0);

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Compact Green Header */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <Sparkles className="w-3 h-3" />
              <span>Catalogue général</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Catalogue des Formations
            </h1>
            <p className="text-xs text-emerald-100/75 leading-relaxed">
              Consultez et administrez les programmes d&apos;apprentissage.
            </p>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <Link
              href="/dashboard/formations/nouveau"
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0a2d26] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Nouvelle formation</span>
            </Link>
          </div>
        </div>

        {/* Compact Stat Bar */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <BookOpen className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Formations:</span>
            <span className="font-bold text-white">
              {formationsList.filter((f) => !f.estBourse).length}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <Users className="w-4 h-4 text-indigo-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Inscrits:</span>
            <span className="font-bold text-white">{totalInscrits}</span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <Layers className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Départements:</span>
            <span className="font-bold text-white">{departements.length}</span>
          </div>
        </div>
      </div>

      <InfoBanner>
        <strong>Catalogue d&apos;apprentissage :</strong> Filtrer par département ou par niveau pour accéder rapidement aux détails d&apos;une formation.
      </InfoBanner>

      {/* Barre de Recherche et Filtres */}
      <div className="w-full flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par titre ou nom de formateur..."
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

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <select
            className="w-full sm:w-auto h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="">Tous les départements</option>
            {departements.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nom}
              </option>
            ))}
          </select>

          <select
            className="w-full sm:w-auto h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
            value={filterNiveau}
            onChange={(e) => setFilterNiveau(e.target.value)}
          >
            <option value="">Tous les niveaux</option>
            <option value="Débutant">Débutant</option>
            <option value="Intermédiaire">Intermédiaire</option>
            <option value="Avancé">Avancé</option>
          </select>
        </div>
      </div>

      {/* Tableau des formations */}
      {filtered.length === 0 ? (
        <div className="w-full text-center py-16 bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {loading ? "Chargement des formations..." : "Aucune formation trouvée"}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {loading
              ? "Veuillez patienter pendant la récupération..."
              : "Aucun cours ne correspond aux critères sélectionnés. Essayez de réinitialiser la recherche."}
          </p>
          {!loading && (
            <Link
              href="/dashboard/formations/nouveau"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a2d26] text-white text-sm font-semibold hover:bg-[#0d3b32] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Créer une formation
            </Link>
          )}
        </div>
      ) : (
        <div className="table-responsive bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">Formation</th>
                <th className="py-3.5 px-4">Formateur & Niveau</th>
                <th className="py-3.5 px-4">Tarif Mensuel</th>
                <th className="py-3.5 px-4">Élèves</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((f) => {
                const dept = departements.find((d) => d.id === f.departementId);
                const inscritsCount = inscritsDe(f);
                const isActive = f.statut === "active" || !f.statut;

                return (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Formation Title & Dept */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                          {f.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={f.imageUrl} alt={f.titre} className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <Link href={`/dashboard/formations/${f.id}`} className="font-semibold text-slate-900 hover:text-[#0a2d26] transition-colors">
                            {f.titre}
                          </Link>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{dept?.nom || "Non spécifié"}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Formateur & Niveau */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{f.formateur?.nom || "Non assigné"}</span>
                      </div>
                      <span
                        className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mt-1 ${
                          f.niveau === "Débutant"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : f.niveau === "Intermédiaire"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {f.niveau || "Standard"}
                      </span>
                    </td>

                    {/* Tarif */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-xs">
                        {formatFCFA(f.prixMensualite || 0)} <span className="text-slate-400 font-normal">/mois</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Durée: {f.dureeMois || 1} mois
                      </div>
                    </td>

                    {/* Élèves */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/dashboard/formations/${f.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                      >
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{inscritsCount} inscrit{inscritsCount > 1 ? "s" : ""}</span>
                      </Link>
                    </td>

                    {/* Statut */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() =>
                          setStatusConfirm({
                            id: f.id,
                            newStatut: isActive ? "inactive" : "active",
                          })
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {isActive ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                        <span>{isActive ? "Actif" : "Inactif"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/dashboard/formations/${f.id}`}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/dashboard/formations/${f.id}/modifier`}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Modifier sur la page dédiée"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeletingFormationId(f.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer la formation"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal Confirmation Statut */}
      <Dialog open={!!statusConfirm} onOpenChange={(open) => !open && setStatusConfirm(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[425px] rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Confirmer le statut
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-500 pt-2">
              Voulez-vous modifier le statut de cette formation en{" "}
              <strong>{statusConfirm?.newStatut === "active" ? "Actif" : "Inactif"}</strong> ?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2">
            <button
              className="w-full sm:w-auto h-10 px-4 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50"
              onClick={() => setStatusConfirm(null)}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 rounded-lg bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-medium text-sm transition-all flex items-center justify-center gap-2"
              onClick={confirmStatusChange}
              disabled={submitting}
            >
              {submitting ? "Traitement..." : "Confirmer"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmation Suppression */}
      <Dialog open={!!deletingFormationId} onOpenChange={(open) => !open && setDeletingFormationId(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[425px] rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Supprimer la formation
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-600 pt-2">
              Êtes-vous sûr de vouloir supprimer définitivement cette formation ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2">
            <button
              className="w-full sm:w-auto h-10 px-4 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50"
              onClick={() => setDeletingFormationId(null)}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-all"
              onClick={confirmDelete}
              disabled={submitting}
            >
              {submitting ? "Suppression..." : "Supprimer définitivement"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
