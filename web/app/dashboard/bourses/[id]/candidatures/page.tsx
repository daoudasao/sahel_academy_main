"use client";

import { use, useState, useEffect, Fragment } from "react";
import Link from "next/link";
import {
  getAdmissionLabel,
  formatDate,
} from "@/app/lib/mock-data";
import { boursesApi } from "@/app/lib/api";
import { 
  ArrowLeft, CheckCircle2, XCircle, Users, CheckSquare, Square, Search, ChevronDown, Sparkles, RefreshCw
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";

export default function CandidaturesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [bourse, setBourse] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // candidatures locales (mises à jour au changement de statut)
  const [localCandidatures, setLocalCandidatures] = useState<any[]>([]);

  // Modal de confirmation (admettre / refuser)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: "admettre" | "refuser" | "batch_admettre" | "batch_refuser" | null;
    candidatureId?: string;
    candidatNom?: string;
  }>({
    open: false,
    type: null,
  });
  const [processingAction, setProcessingAction] = useState(false);

  // Modal de changement de statut
  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    candidatureId: string;
    candidatNom: string;
    currentStatut: string;
  }>({
    open: false,
    candidatureId: "",
    candidatNom: "",
    currentStatut: "",
  });
  const [newCandidatureStatut, setNewCandidatureStatut] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const b = await boursesApi.get(id);
        setBourse(b);
        setLocalCandidatures(b.candidatures ?? []);
      } catch {
        setBourse(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh] text-slate-500">Chargement…</div>;
  }

  if (!bourse) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Bourse introuvable</h1>
        <Link href="/dashboard/bourses" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-[#0a2d26] text-white hover:bg-[#0a2d26]/90 h-10 px-4 py-2">
          ← Retour aux bourses
        </Link>
      </div>
    );
  }

  const bourseCandidatures = localCandidatures.filter((c) => c.bourseId === id);
  const filtered = bourseCandidatures.filter((c) => {
    const matchStatus = !filterStatut || c.statut === filterStatut;
    const matchSearch = c.nom.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: bourseCandidatures.length,
    enAttente: bourseCandidatures.filter((c) => c.statut === "enAttente").length,
    admis: bourseCandidatures.filter((c) => c.statut === "admis").length,
    refuse: bourseCandidatures.filter((c) => c.statut === "refuse").length,
  };

  const isFiltered = search !== "" || filterStatut !== "";

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const toggleSelect = (candId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(candId)) {
      newSet.delete(candId);
    } else {
      newSet.add(candId);
    }
    setSelectedIds(newSet);
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.type || processingAction) return;
    setProcessingAction(true);
    try {
      if (confirmModal.type === "admettre" && confirmModal.candidatureId) {
        await boursesApi.updateCandidature(confirmModal.candidatureId, { statut: "admis" });
        setLocalCandidatures((prev) => prev.map((c) => (c.id === confirmModal.candidatureId ? { ...c, statut: "admis" } : c)));
      } else if (confirmModal.type === "refuser" && confirmModal.candidatureId) {
        await boursesApi.updateCandidature(confirmModal.candidatureId, { statut: "refuse" });
        setLocalCandidatures((prev) => prev.map((c) => (c.id === confirmModal.candidatureId ? { ...c, statut: "refuse" } : c)));
      } else if (confirmModal.type === "batch_admettre") {
        const ids = Array.from(selectedIds);
        await Promise.all(ids.map((cid) => boursesApi.updateCandidature(cid, { statut: "admis" })));
        setLocalCandidatures((prev) => prev.map((c) => (selectedIds.has(c.id) ? { ...c, statut: "admis" } : c)));
        setSelectedIds(new Set());
      } else if (confirmModal.type === "batch_refuser") {
        const ids = Array.from(selectedIds);
        await Promise.all(ids.map((cid) => boursesApi.updateCandidature(cid, { statut: "refuse" })));
        setLocalCandidatures((prev) => prev.map((c) => (selectedIds.has(c.id) ? { ...c, statut: "refuse" } : c)));
        setSelectedIds(new Set());
      }
      setConfirmModal({ open: false, type: null });
    } catch (err) {
      console.error("Erreur action candidature:", err);
      alert("Une erreur est survenue lors de la mise à jour.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleUpdateCandidatureStatut = async () => {
    if (!statusModal.candidatureId || !newCandidatureStatut || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await boursesApi.updateCandidature(statusModal.candidatureId, { statut: newCandidatureStatut });
      setLocalCandidatures((prev) =>
        prev.map((c) => (c.id === statusModal.candidatureId ? { ...c, statut: newCandidatureStatut } : c))
      );
      setStatusModal({ open: false, candidatureId: "", candidatNom: "", currentStatut: "" });
      setNewCandidatureStatut("");
    } catch (err) {
      console.error("Erreur mise à jour statut candidature:", err);
      alert("Erreur lors du changement de statut.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      
      {/* Compact Green Header */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/bourses"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all border border-white/15 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
                <span>Traitement des Postulants</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Candidatures — {bourse.titre}
              </h1>
              <p className="text-xs text-emerald-100/75">
                Examinez les dossiers soumis et validez ou refusez.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div 
          className={`rounded-xl border shadow-sm p-4 cursor-pointer transition-all ${!filterStatut ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 hover:border-slate-400'}`}
          onClick={() => setFilterStatut("")}
        >
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className={`text-sm font-medium ${!filterStatut ? 'text-slate-300' : 'text-slate-500'}`}>Total</h3>
            <Users className={`h-4 w-4 ${!filterStatut ? 'text-slate-300' : 'text-blue-500'}`} />
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div 
          className={`rounded-xl border shadow-sm p-4 cursor-pointer transition-all ${filterStatut === 'enAttente' ? 'bg-amber-50 border-amber-400' : 'bg-white hover:border-amber-300'}`}
          onClick={() => setFilterStatut(filterStatut === "enAttente" ? "" : "enAttente")}
        >
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-slate-500">En attente</h3>
            <div className="h-2 w-2 rounded-full bg-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.enAttente}</div>
        </div>
        <div 
          className={`rounded-xl border shadow-sm p-4 cursor-pointer transition-all ${filterStatut === 'admis' ? 'bg-emerald-50 border-emerald-400' : 'bg-white hover:border-emerald-300'}`}
          onClick={() => setFilterStatut(filterStatut === "admis" ? "" : "admis")}
        >
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-slate-500">Admis</h3>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.admis}</div>
        </div>
        <div 
          className={`rounded-xl border shadow-sm p-4 cursor-pointer transition-all ${filterStatut === 'refuse' ? 'bg-red-50 border-red-400' : 'bg-white hover:border-red-300'}`}
          onClick={() => setFilterStatut(filterStatut === "refuse" ? "" : "refuse")}
        >
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-slate-500">Refusés</h3>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.refuse}</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm bg-white overflow-hidden">
        
        {/* Toolbar & Batch Actions */}
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {isFiltered && (
            <button 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors text-red-500 hover:bg-red-50 h-9 px-3 gap-1 mr-auto"
              onClick={() => { setSearch(""); setFilterStatut(""); }}
            >
              <XCircle className="h-4 w-4" />
              Réinitialiser
            </button>
          )}

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 animate-in slide-in-from-right-4">
              <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                {selectedIds.size} sélectionné(s)
              </span>
              <button 
                onClick={() => setConfirmModal({ open: true, type: "batch_admettre" })}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-emerald-100 text-emerald-700 hover:bg-emerald-200 h-9 px-4 py-2 cursor-pointer"
              >
                Accepter
              </button>
              <button 
                onClick={() => setConfirmModal({ open: true, type: "batch_refuser" })}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-red-100 text-red-700 hover:bg-red-200 h-9 px-4 py-2 cursor-pointer"
              >
                Refuser
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <div className="table-responsive">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b">
              <tr>
                <th className="px-4 py-3 font-semibold cursor-pointer w-12" onClick={toggleSelectAll}>
                  {selectedIds.size > 0 && selectedIds.size === filtered.length ? (
                    <CheckSquare className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-300 hover:text-slate-400" />
                  )}
                </th>
                <th className="px-4 py-3 font-semibold">Candidat</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Date de dépôt</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Aucune candidature trouvée.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isSelected = selectedIds.has(c.id);
                  const isExpanded = expandedId === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr 
                        className={`transition-colors hover:bg-slate-50/80 ${isSelected ? 'bg-emerald-50/50' : ''} ${isExpanded ? 'bg-slate-50' : ''}`}
                      >
                        <td className="px-4 py-3 cursor-pointer" onClick={() => toggleSelect(c.id)}>
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-300 hover:text-slate-400" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            {c.avatarUrl || c.image || c.avatar || c.user?.avatarUrl || c.user?.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={c.avatarUrl || c.image || c.avatar || c.user?.avatarUrl || c.user?.image}
                                alt={c.nom}
                                className="h-8 w-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                {c.nom.charAt(0)}
                              </div>
                            )}
                            {c.nom}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{c.email}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(c.dateDepot)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              setStatusModal({
                                open: true,
                                candidatureId: c.id,
                                candidatNom: c.nom,
                                currentStatut: c.statut,
                              });
                              setNewCandidatureStatut(c.statut);
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold hover:opacity-80 transition cursor-pointer ${
                              c.statut === 'admis' ? 'bg-emerald-100 text-emerald-700' :
                              c.statut === 'refuse' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}
                            title="Cliquer pour modifier le statut"
                          >
                            <span>{getAdmissionLabel(c.statut)}</span>
                            <RefreshCw className="w-3 h-3 opacity-60" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer gap-1.5 ${
                              isExpanded
                                ? "bg-[#0a2d26] text-white shadow-sm"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                            }`}
                            title={isExpanded ? "Masquer les détails" : "Afficher les détails"}
                          >
                            <span>{isExpanded ? "Masquer les détails" : "Afficher les détails"}</span>
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        </td>
                      </tr>

                      {/* Ligne déroulante : Détails de la candidature */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={6} className="px-0 py-0">
                            <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                              <div className="mx-4 my-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                
                                {/* En-tête détails */}
                                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-900">Réponses au formulaire</h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {c.nom} • {c.email} • Déposée le {formatDate(c.dateDepot)}
                                    </p>
                                  </div>
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    c.statut === 'admis' ? 'bg-emerald-100 text-emerald-800' :
                                    c.statut === 'refuse' ? 'bg-red-100 text-red-800' :
                                    'bg-amber-100 text-amber-800'
                                  }`}>
                                    {getAdmissionLabel(c.statut)}
                                  </span>
                                </div>
                                
                                {/* Réponses */}
                                <div className="p-5">
                                  {(() => {
                                    let repObj: Record<string, any> = {};
                                    if (c.reponses) {
                                      if (typeof c.reponses === "string") {
                                        try { repObj = JSON.parse(c.reponses); } catch {}
                                      } else if (typeof c.reponses === "object") {
                                        repObj = c.reponses;
                                      }
                                    }

                                    const champs = (bourse.champs ?? []).filter((c: any) => c.type !== "lien");

                                    const getValue = (champ: any) => {
                                      if (!repObj) return null;
                                      if (champ.id && repObj[champ.id] !== undefined && repObj[champ.id] !== null && String(repObj[champ.id]).trim() !== "") {
                                        return String(repObj[champ.id]);
                                      }
                                      if (champ.label && repObj[champ.label] !== undefined && repObj[champ.label] !== null && String(repObj[champ.label]).trim() !== "") {
                                        return String(repObj[champ.label]);
                                      }
                                      if (champ.cle && repObj[champ.cle] !== undefined && repObj[champ.cle] !== null && String(repObj[champ.cle]).trim() !== "") {
                                        return String(repObj[champ.cle]);
                                      }

                                      const targetLabel = (champ.label || "").toLowerCase().trim();
                                      const targetCle = (champ.cle || "").toLowerCase().trim();
                                      const targetId = (champ.id || "").toLowerCase().trim();

                                      for (const [k, v] of Object.entries(repObj)) {
                                        if (v === undefined || v === null || String(v).trim() === "") continue;
                                        const lk = k.toLowerCase().trim();
                                        if (lk && (lk === targetLabel || lk === targetCle || lk === targetId)) {
                                          return String(v);
                                        }
                                      }
                                      return null;
                                    };

                                    const matchedKeys = new Set<string>();

                                    const champBlocks = champs.map((champ: any, idx: number) => {
                                      const val = getValue(champ);

                                      if (champ.id && repObj[champ.id] !== undefined) matchedKeys.add(champ.id);
                                      if (champ.label && repObj[champ.label] !== undefined) matchedKeys.add(champ.label);
                                      if (champ.cle && repObj[champ.cle] !== undefined) matchedKeys.add(champ.cle);
                                      const targetLabel = (champ.label || "").toLowerCase().trim();
                                      for (const k of Object.keys(repObj)) {
                                        if (k.toLowerCase().trim() === targetLabel) matchedKeys.add(k);
                                      }

                                      return (
                                        <div key={champ.id || idx}>
                                          <h5 className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                                            {champ.label || `Champ #${idx + 1}`}
                                          </h5>
                                          <div className="text-sm text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap min-h-[40px]">
                                            {val || <span className="text-slate-400 italic">Aucune réponse fournie</span>}
                                          </div>
                                        </div>
                                      );
                                    });

                                    const leftoverKeys = Object.keys(repObj).filter((k) => !matchedKeys.has(k));
                                    const leftoverBlocks = leftoverKeys.map((key) => {
                                      const val = repObj[key];
                                      if (val === undefined || val === null || String(val).trim() === "") return null;
                                      return (
                                        <div key={key}>
                                          <h5 className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                                            {key}
                                          </h5>
                                          <div className="text-sm text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap min-h-[40px]">
                                            {String(val)}
                                          </div>
                                        </div>
                                      );
                                    }).filter(Boolean);

                                    if (champBlocks.length === 0 && leftoverBlocks.length === 0) {
                                      return (
                                        <div className="text-sm text-slate-400 italic py-2">
                                          Aucune réponse enregistrée dans le formulaire.
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="grid gap-4 sm:grid-cols-2">
                                        {champBlocks}
                                        {leftoverBlocks}
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Actions */}
                                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-end gap-2.5">
                                  {c.statut === "enAttente" || !c.statut ? (
                                    <>
                                      <button 
                                        onClick={() => setConfirmModal({ open: true, type: "refuser", candidatureId: c.id, candidatNom: c.nom })}
                                        className="inline-flex items-center justify-center rounded-lg text-xs font-semibold transition-colors bg-red-100 text-red-700 hover:bg-red-200 h-9 px-4 gap-1.5 cursor-pointer"
                                      >
                                        <XCircle className="h-3.5 w-3.5" />
                                        Refuser
                                      </button>
                                      <button 
                                        onClick={() => setConfirmModal({ open: true, type: "admettre", candidatureId: c.id, candidatNom: c.nom })}
                                        className="inline-flex items-center justify-center rounded-lg text-xs font-semibold transition-colors bg-[#0a2d26] text-white hover:bg-[#0a2d26]/90 h-9 px-4 gap-1.5 shadow-sm cursor-pointer"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Admettre
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setStatusModal({
                                          open: true,
                                          candidatureId: c.id,
                                          candidatNom: c.nom,
                                          currentStatut: c.statut,
                                        });
                                        setNewCandidatureStatut(c.statut);
                                      }}
                                      className="inline-flex items-center justify-center rounded-lg text-xs font-semibold transition-colors bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 h-9 px-3.5 gap-1.5 cursor-pointer shadow-2xs"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                                      Changer le statut
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Modal de confirmation Admission / Refus */}
      <Dialog
        open={confirmModal.open}
        onOpenChange={(open) => {
          if (!open && !processingAction) {
            setConfirmModal({ open: false, type: null });
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {confirmModal.type === "admettre" || confirmModal.type === "batch_admettre" ? (
                <div className="flex items-center gap-2 text-emerald-700">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <span>Confirmer l&apos;admission</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span>Confirmer le refus</span>
                </div>
              )}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-slate-600 leading-relaxed">
              {confirmModal.type === "admettre" && (
                <>
                  Voulez-vous vraiment <strong>admettre</strong> le candidat <strong>&ldquo;{confirmModal.candidatNom}&rdquo;</strong> pour la bourse <strong>&ldquo;{bourse?.titre}&rdquo;</strong> ?
                  <span className="text-emerald-700 text-xs mt-2 block font-medium">
                    ✓ L&apos;étudiant recevra une notification de confirmation d&apos;admission.
                  </span>
                </>
              )}
              {confirmModal.type === "refuser" && (
                <>
                  Voulez-vous vraiment <strong>refuser</strong> la candidature de <strong>&ldquo;{confirmModal.candidatNom}&rdquo;</strong> pour la bourse <strong>&ldquo;{bourse?.titre}&rdquo;</strong> ?
                  <span className="text-red-700 text-xs mt-2 block font-medium">
                    ⚠️ L&apos;étudiant recevra une notification l&apos;informant du refus de son dossier.
                  </span>
                </>
              )}
              {confirmModal.type === "batch_admettre" && (
                <>
                  Voulez-vous vraiment <strong>admettre</strong> les <strong>{selectedIds.size}</strong> candidatures sélectionnées ?
                  <span className="text-emerald-700 text-xs mt-2 block font-medium">
                    ✓ Les candidats sélectionnés recevront chacun leur notification d&apos;admission.
                  </span>
                </>
              )}
              {confirmModal.type === "batch_refuser" && (
                <>
                  Voulez-vous vraiment <strong>refuser</strong> les <strong>{selectedIds.size}</strong> candidatures sélectionnées ?
                  <span className="text-red-700 text-xs mt-2 block font-medium">
                    ⚠️ Les candidats sélectionnés recevront chacun une notification de refus.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2 border-t mt-3">
            <button
              className="w-full sm:w-auto h-10 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              onClick={() => setConfirmModal({ open: false, type: null })}
              disabled={processingAction}
            >
              Annuler
            </button>
            <button
              className={`w-full sm:w-auto h-10 px-5 rounded-xl text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                confirmModal.type === "admettre" || confirmModal.type === "batch_admettre"
                  ? "bg-[#0a2d26] hover:bg-[#0d3b32]"
                  : "bg-red-600 hover:bg-red-700"
              }`}
              onClick={handleConfirmAction}
              disabled={processingAction}
            >
              {processingAction
                ? "Traitement..."
                : confirmModal.type === "admettre" || confirmModal.type === "batch_admettre"
                ? "Confirmer l'admission"
                : "Confirmer le refus"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de changement de statut libre */}
      <Dialog
        open={statusModal.open}
        onOpenChange={(open) => {
          if (!open && !updatingStatus) {
            setStatusModal({ open: false, candidatureId: "", candidatNom: "", currentStatut: "" });
            setNewCandidatureStatut("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0a2d26] text-lg font-bold">
              <RefreshCw className="w-5 h-5 text-emerald-600" />
              Changer le statut de la candidature
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-600">
              Candidat : <strong className="text-slate-800">&ldquo;{statusModal.candidatNom}&rdquo;</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            {[
              { value: "enAttente", label: "En attente", desc: "Dossier en cours d'examen", color: "border-amber-300 bg-amber-50 text-amber-900" },
              { value: "admis", label: "Admis", desc: "Candidature acceptée pour la bourse", color: "border-emerald-300 bg-emerald-50 text-emerald-900" },
              { value: "refuse", label: "Refusé", desc: "Candidature non retenue", color: "border-red-300 bg-red-50 text-red-900" },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  newCandidatureStatut === opt.value
                    ? opt.color + " ring-2 ring-offset-1 ring-emerald-500"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="candidatureStatut"
                  value={opt.value}
                  checked={newCandidatureStatut === opt.value}
                  onChange={() => setNewCandidatureStatut(opt.value)}
                  className="accent-[#0a2d26]"
                />
                <div>
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2 border-t mt-4">
            <button
              className="w-full sm:w-auto h-10 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              onClick={() => {
                setStatusModal({ open: false, candidatureId: "", candidatNom: "", currentStatut: "" });
                setNewCandidatureStatut("");
              }}
              disabled={updatingStatus}
            >
              Annuler
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              onClick={handleUpdateCandidatureStatut}
              disabled={updatingStatus || newCandidatureStatut === statusModal.currentStatut}
            >
              {updatingStatus ? "Mise à jour..." : "Appliquer le statut"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
