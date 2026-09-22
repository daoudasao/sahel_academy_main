"use client";

import { useState, useEffect, Fragment } from "react";
import InfoBanner from "@/app/components/InfoBanner";
import { formatCreneau } from "@/app/lib/mock-data";
import { centresApi } from "@/app/lib/api";
import {
  MapPin,
  Phone,
  Clock,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  Sparkles,
  Building2,
  Calendar,
  X,
  Search,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";

const formVide = { nom: "", ville: "", adresse: "", telephone: "" };

interface Creneau {
  id: string;
  dateHeure: string;
}

interface Centre {
  id: string;
  nom: string;
  ville: string;
  adresse?: string;
  telephone?: string;
  creneaux: Creneau[];
}

export default function CentresPage() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Formulaire & Modal Édition / Création
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(formVide);
  const [submitting, setSubmitting] = useState(false);

  // Modal Suppression
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  // Input créneau par centre
  const [newSlotMap, setNewSlotMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        setCentres(await centresApi.list());
      } catch (err) {
        console.error("Erreur lors du chargement des centres:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openNew = () => {
    setEditId(null);
    setForm(formVide);
    setModalOpen(true);
  };

  const openEdit = (c: Centre) => {
    setEditId(c.id);
    setForm({
      nom: c.nom,
      ville: c.ville,
      adresse: c.adresse || "",
      telephone: c.telephone || "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.nom.trim() || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        nom: form.nom.trim(),
        ville: form.ville,
        adresse: form.adresse || undefined,
        telephone: form.telephone || undefined,
      };
      if (editId) {
        const updated = await centresApi.update(editId, payload);
        setCentres((cs) => cs.map((c) => (c.id === editId ? { ...c, ...updated } : c)));
      } else {
        const created = await centresApi.create(payload);
        setCentres((cs) => [...cs, { ...created, creneaux: created.creneaux ?? [] }]);
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du centre:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const del = async () => {
    if (!deletingId || submitting) return;
    setSubmitting(true);
    try {
      await centresApi.remove(deletingId);
      setCentres((cs) => cs.filter((c) => c.id !== deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error("Erreur lors de la suppression du centre:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const addSlot = async (centreId: string) => {
    const iso = newSlotMap[centreId];
    if (!iso) return;
    try {
      const created = await centresApi.addCreneau(centreId, {
        dateHeure: new Date(iso).toISOString(),
      });
      setCentres((cs) =>
        cs.map((c) => (c.id !== centreId ? c : { ...c, creneaux: [...c.creneaux, created] }))
      );
      setNewSlotMap((prev) => ({ ...prev, [centreId]: "" }));
    } catch (err) {
      console.error("Erreur lors de l'ajout du créneau:", err);
    }
  };

  const removeSlot = async (centreId: string, creneauId: string) => {
    try {
      await centresApi.removeCreneau(centreId, creneauId);
      setCentres((cs) =>
        cs.map((c) =>
          c.id !== centreId ? c : { ...c, creneaux: c.creneaux.filter((x) => x.id !== creneauId) }
        )
      );
    } catch (err) {
      console.error("Erreur suppression créneau:", err);
    }
  };

  const filtered = centres.filter(
    (c) =>
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      c.ville.toLowerCase().includes(search.toLowerCase()) ||
      (c.adresse || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalCreneaux = centres.reduce((s, c) => s + c.creneaux.length, 0);

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Compact Green Header */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <Sparkles className="w-3 h-3" />
              <span>Lieux d&apos;accueil &amp; examens</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Centres d&apos;Examen &amp; Créneaux
            </h1>
            <p className="text-xs text-emerald-100/75 leading-relaxed">
              Gérez les implantations physiques et planifiez les créneaux de rendez-vous.
            </p>
          </div>

          <div className="w-full sm:w-auto">
            <button
              onClick={openNew}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0a2d26] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nouveau centre</span>
            </button>
          </div>
        </div>

        {/* Compact Stat Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <Building2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Centres:</span>
            <span className="font-bold text-white">{centres.length}</span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <Clock className="w-4 h-4 text-indigo-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Créneaux ouverts:</span>
            <span className="font-bold text-white">{totalCreneaux}</span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Visibles:</span>
            <span className="font-bold text-white">{filtered.length}</span>
          </div>
        </div>
      </div>

      <InfoBanner>
        <strong>Objectif :</strong> Configurer les centres physiques et leurs créneaux disponibles pour les rendez-vous.<br />
        <strong>Utilité :</strong> Permet aux candidats admis de sélectionner un créneau de visite directement depuis l&apos;application mobile.
      </InfoBanner>

      {/* Barre de Recherche */}
      <div className="w-full flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, ville ou adresse..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 sm:bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26]/20 focus:border-[#0a2d26] transition-all"
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

      {/* Tableau des Centres - Réactif */}
      {filtered.length === 0 ? (
        <div className="w-full text-center py-16 bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {loading ? "Chargement des centres..." : "Aucun centre trouvé"}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {loading
              ? "Veuillez patienter pendant la récupération des implantations..."
              : "Aucun centre ne correspond à vos critères de recherche."}
          </p>
          {!loading && (
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a2d26] text-white text-sm font-semibold hover:bg-[#0d3b32] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nouveau centre
            </button>
          )}
        </div>
      ) : (
        <div className="table-responsive bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">Centre &amp; Ville</th>
                <th className="py-3.5 px-4">Adresse &amp; Contact</th>
                <th className="py-3.5 px-4">Créneaux</th>
                <th className="py-3.5 px-4 text-right">Actions Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((c) => {
                const creneaux = [...c.creneaux].sort((a, b) => (a.dateHeure < b.dateHeure ? -1 : 1));
                const isExpanded = expandedId === c.id;

                return (
                  <Fragment key={c.id}>
                    <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? "bg-slate-50/60" : ""}`}>
                      {/* Centre & Ville */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0a2d26] via-[#0d3b32] to-[#124b40] text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{c.nom}</div>
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {c.ville || "Ville non précisée"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Adresse & Contact */}
                      <td className="py-3.5 px-4 text-xs text-slate-600 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{c.adresse || "Adresse non renseignée"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{c.telephone || "Téléphone non renseigné"}</span>
                        </div>
                      </td>

                      {/* Créneaux */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            isExpanded
                              ? "bg-[#0a2d26] text-white border-[#0a2d26] shadow-xs"
                              : "bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100"
                          }`}
                          title={isExpanded ? "Masquer les créneaux" : "Gérer les créneaux horaire"}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{creneaux.length} créneau{creneaux.length > 1 ? "x" : ""}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180 text-emerald-300" : "text-indigo-600"}`} />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition cursor-pointer"
                            onClick={() => openEdit(c)}
                            title="Modifier ce centre"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Modifier</span>
                          </button>
                          <button
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs transition cursor-pointer"
                            onClick={() => {
                              setDeletingId(c.id);
                              setDeletingName(c.nom);
                            }}
                            title="Supprimer ce centre"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Ligne accordéon de gestion des créneaux */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 border-b border-slate-200/60">
                        <td colSpan={4} className="px-6 py-4">
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-4 h-4 text-indigo-600" />
                                <span>Créneaux horaire disponibles — {c.nom} ({creneaux.length})</span>
                              </h4>
                              <button
                                onClick={() => setExpandedId(null)}
                                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                              >
                                Masquer
                              </button>
                            </div>

                            {/* Badges de créneaux */}
                            <div className="flex flex-wrap gap-2">
                              {creneaux.length === 0 ? (
                                <span className="text-xs text-slate-400 italic py-1">
                                  Aucun créneau configuré pour ce centre.
                                </span>
                              ) : (
                                creneaux.map((cr) => (
                                  <span
                                    key={cr.id}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200/80 text-xs font-medium"
                                  >
                                    <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <span>{formatCreneau(cr.dateHeure)}</span>
                                    <button
                                      onClick={() => removeSlot(c.id, cr.id)}
                                      className="text-indigo-400 hover:text-red-600 p-0.5 rounded-md hover:bg-indigo-100/80 transition"
                                      title="Supprimer ce créneau"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </span>
                                ))
                              )}
                            </div>

                            {/* Formulaire d'ajout rapide de créneau */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 border-t border-slate-100">
                              <input
                                type="datetime-local"
                                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                                value={newSlotMap[c.id] || ""}
                                onChange={(e) =>
                                  setNewSlotMap({ ...newSlotMap, [c.id]: e.target.value })
                                }
                              />
                              <button
                                onClick={() => addSlot(c.id)}
                                disabled={!newSlotMap[c.id]}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] text-white text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Ajouter ce créneau</span>
                              </button>
                            </div>
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

      {/* Modal Création / Modification Centre */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0a2d26] text-lg font-bold">
              <Building2 className="w-5 h-5 text-emerald-600" />
              {editId ? "Modifier le centre" : "Nouveau centre physique"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-600">
              Renseignez les coordonnées d&apos;implantation du centre d&apos;examen ou de visite.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nom du centre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                placeholder="Ex: Centre Principal Bamako"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Ville
              </label>
              <input
                type="text"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                placeholder="Ex: Bamako"
                value={form.ville}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Adresse physique
              </label>
              <input
                type="text"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                placeholder="Ex: ACI 2000, Rue 300"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Téléphone de contact
              </label>
              <input
                type="text"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                placeholder="Ex: +223 20 00 00 01"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2 border-t mt-3">
            <button
              className="w-full sm:w-auto h-10 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              onClick={save}
              disabled={!form.nom.trim() || submitting}
            >
              {submitting ? "Enregistrement..." : editId ? "Enregistrer les modifications" : "Créer le centre"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Suppression */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 text-lg font-bold">
              <Trash2 className="w-5 h-5" />
              Supprimer le centre
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-slate-600 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer le centre <strong>&ldquo;{deletingName}&rdquo;</strong> ?<br />
              <span className="text-red-600 text-xs mt-2 block font-medium">
                ⚠️ Cette action est irréversible et supprimera également l&apos;ensemble des créneaux associés.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2 border-t mt-3">
            <button
              className="w-full sm:w-auto h-10 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              onClick={() => setDeletingId(null)}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              onClick={del}
              disabled={submitting}
            >
              {submitting ? "Suppression..." : "Oui, supprimer le centre"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
