"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import InfoBanner from "@/app/components/InfoBanner";
import {
  formatFCFA,
  formatDate,
  formatDateTime,
  getStatutPaiement,
  getStatutLabel,
  getStatutBadgeClass,
} from "@/app/lib/mock-data";
import { paiementsApi, formationsApi } from "@/app/lib/api";
import {
  XCircle,
  History,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

export default function PaiementsPage() {
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>("");
  const [filterFormation, setFilterFormation] = useState("");
  const [echeancesData, setEcheancesData] = useState<any[]>([]);
  const [formationsList, setFormationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());
  const [expandedFormationKeys, setExpandedFormationKeys] = useState<Record<string, boolean>>({});

  const toggleExpandFormation = (key: string) => {
    setExpandedFormationKeys((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }));
  };

  const [historyModalEcheanceId, setHistoryModalEcheanceId] = useState<string | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentNote, setNewPaymentNote] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentNote, setEditPaymentNote] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [ech, forms] = await Promise.all([paiementsApi.list(), formationsApi.list()]);
        setEcheancesData(ech);
        setFormationsList(forms);
      } catch {
        /* UI vide */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleExpandUser = (userId: string) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const enriched = echeancesData.map((e) => {
    const paiements = e.paiements ?? [];
    const montantPaye = e.montantPaye ?? paiements.reduce((sum: number, p: any) => sum + p.montant, 0);
    const restant = Math.max(0, e.montantDu - montantPaye);
    const tempEcheance = { ...e, montantPaye };

    let formattedLibelle = e.libelle || "";
    if ((formattedLibelle.toLowerCase().startsWith("mensualit") || formattedLibelle.includes("/")) && e.dateEcheance) {
      try {
        const d = new Date(e.dateEcheance);
        if (!isNaN(d.getTime())) {
          const monthName = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
          const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
          formattedLibelle = `Mensualité - ${formattedMonth}`;
        }
      } catch (_) {}
    }

    return {
      ...tempEcheance,
      libelle: formattedLibelle,
      statut: getStatutPaiement(tempEcheance),
      userName: e.user?.nom ?? "Utilisateur inconnu",
      userEmail: e.user?.email ?? "",
      userAvatar: e.user?.avatarUrl || e.user?.image || e.user?.avatar,
      formationTitre: e.formation?.titre ?? "—",
      restant,
      paiements,
    };
  });

  interface UserGroup {
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar?: string;
    totalDu: number;
    totalPaye: number;
    totalRestant: number;
    statutGlobal: "paye" | "partiel" | "enRetard" | "aVenir";
    echeances: typeof enriched;
  }

  const grouped = enriched.reduce<Record<string, UserGroup>>((acc, ech) => {
    const uId = ech.userId || ech.user?.id || "unknown";
    if (!acc[uId]) {
      acc[uId] = {
        userId: uId,
        userName: ech.userName,
        userEmail: ech.userEmail,
        userAvatar: ech.userAvatar,
        totalDu: 0,
        totalPaye: 0,
        totalRestant: 0,
        statutGlobal: "paye",
        echeances: [],
      };
    }
    acc[uId].totalDu += ech.montantDu;
    acc[uId].totalPaye += ech.montantPaye;
    acc[uId].totalRestant += ech.restant;
    acc[uId].echeances.push(ech);
    return acc;
  }, {});

  const userGroups = Object.values(grouped).map((group) => {
    let statutGlobal: "paye" | "partiel" | "enRetard" | "aVenir" = "paye";
    const hasEnRetard = group.echeances.some((e) => e.statut === "enRetard");
    if (hasEnRetard) {
      statutGlobal = "enRetard";
    } else if (group.totalRestant > 0 && group.totalPaye > 0) {
      statutGlobal = "partiel";
    } else if (group.totalRestant > 0) {
      statutGlobal = "aVenir";
    }
    return { ...group, statutGlobal };
  });

  const filteredGroups = userGroups.filter((group) => {
    const matchSearch =
      group.userName.toLowerCase().includes(search.toLowerCase()) ||
      group.userEmail.toLowerCase().includes(search.toLowerCase());
    const matchStatut =
      !filterStatut ||
      group.statutGlobal === filterStatut ||
      group.echeances.some((e) => e.statut === filterStatut);
    const matchFormation =
      !filterFormation ||
      group.echeances.some((e) => e.formationId === filterFormation);
    return matchSearch && matchStatut && matchFormation;
  });

  const isFiltered = search !== "" || filterStatut !== "" || filterFormation !== "";

  const totalDu = enriched.reduce((s, e) => s + e.montantDu, 0);
  const totalPaye = enriched.reduce((s, e) => s + e.montantPaye, 0);
  const totalRestant = enriched.reduce((s, e) => s + e.restant, 0);
  const enRetard = enriched.filter((e) => e.statut === "enRetard").length;

  const handleAddPayment = async () => {
    if (!historyModalEcheanceId || busy) return;
    const amount = Number(newPaymentAmount);
    if (amount <= 0) return;
    setBusy(true);
    try {
      const created = await paiementsApi.addPaiement(historyModalEcheanceId, { montant: amount, note: newPaymentNote || undefined });
      setEcheancesData((prev) => prev.map((e) => {
        if (e.id !== historyModalEcheanceId) return e;
        return {
          ...e,
          montantPaye: (e.montantPaye ?? 0) + amount,
          datePaiement: new Date().toISOString(),
          paiements: [...(e.paiements ?? []), created],
        };
      }));
      setNewPaymentAmount("");
      setNewPaymentNote("");
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePayment = async (echeanceId: string, paymentId: string, montant: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await paiementsApi.removePaiement(echeanceId, paymentId);
      setEcheancesData((prev) => prev.map((e) => {
        if (e.id !== echeanceId) return e;
        return {
          ...e,
          montantPaye: Math.max(0, (e.montantPaye ?? 0) - montant),
          paiements: (e.paiements ?? []).filter((p: any) => p.id !== paymentId),
        };
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (echeanceId: string) => {
    if (!editingPaymentId || busy) return;
    const amount = Number(editPaymentAmount);
    if (amount <= 0) return;
    setBusy(true);
    try {
      await paiementsApi.updatePaiement(editingPaymentId, { montant: amount, note: editPaymentNote });
      
      setEcheancesData((prev) => prev.map((e) => {
        if (e.id !== echeanceId) return e;
        const oldPayment = e.paiements.find((p: any) => p.id === editingPaymentId);
        const diff = amount - (oldPayment?.montant || 0);
        return {
          ...e,
          montantPaye: Math.max(0, (e.montantPaye ?? 0) + diff),
          paiements: e.paiements.map((p: any) => p.id === editingPaymentId ? { ...p, montant: amount, note: editPaymentNote } : p),
        };
      }));
      setEditingPaymentId(null);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la modification");
    } finally {
      setBusy(false);
    }
  };

  const activeEcheance = historyModalEcheanceId ? enriched.find((e) => e.id === historyModalEcheanceId) : null;

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Compact Green Header */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <span>Gestion Financière</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Suivi des Paiements (Par Élève)
            </h1>
            <p className="text-xs text-emerald-100/75 leading-relaxed">
              Consultez le dossier financier de chaque élève avec ses tranches de paiement.
            </p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <InfoBanner title="Guide de Gestion Financière & Paiements Groupés">
          <strong>Affichage par élève :</strong> Les paiements sont désormais regroupés par élève (une seule ligne par élève). Cliquez sur la flèche 🔽 à côté de l&apos;élève pour dérouler ses échéances.<br />
          <strong>Enregistrer un versement :</strong> Dans le menu déroulant d&apos;un élève, cliquez sur <em>&quot;Gérer&quot;</em> sur la tranche souhaitée pour ajouter ou éditer un paiement.
        </InfoBanner>

        {/* Stats */}
        <div className="stats-grid stagger" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
            </div>
            <div>
              <div className="stat-value">{formatFCFA(totalPaye)}</div>
              <div className="stat-label">Total collecté</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
            </div>
            <div>
              <div className="stat-value">{formatFCFA(totalDu)}</div>
              <div className="stat-label">Total dû</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <div>
              <div className="stat-value">{formatFCFA(totalRestant)}</div>
              <div className="stat-label">Reste à collecter</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </div>
            <div>
              <div className="stat-value">{enRetard}</div>
              <div className="stat-label">Échéances en retard</div>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="table-container animate-in">
          <div className="table-toolbar flex-wrap gap-3">
            <div className="table-search flex-1 min-w-[200px]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher par élève..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="form-select" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} style={{ minWidth: 140 }}>
              <option value="">Tous les statuts</option>
              <option value="paye">Payé</option>
              <option value="partiel">Partiel</option>
              <option value="aVenir">À venir</option>
              <option value="enRetard">En retard</option>
            </select>
            <select className="form-select" value={filterFormation} onChange={(e) => setFilterFormation(e.target.value)} style={{ minWidth: 180 }}>
              <option value="">Toutes les formations</option>
              {formationsList.filter((f) => !f.estBourse).map((f) => (
                <option key={f.id} value={f.id}>{f.titre}</option>
              ))}
            </select>

            {isFiltered && (
              <button
                className="btn btn-ghost btn-sm text-red-500 flex items-center gap-1 hover:bg-red-50"
                onClick={() => { setSearch(""); setFilterStatut(""); setFilterFormation(""); }}
              >
                <XCircle className="h-4 w-4" />
                Réinitialiser
              </button>
            )}

            <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: "auto" }}>
              {filteredGroups.length} élève{filteredGroups.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="table-responsive">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50/50">
                    <th style={{ width: 48, textAlign: "center" }}></th>
                    <th>Élève</th>
                    <th>Échéances</th>
                    <th>Montant dû</th>
                    <th>Total Payé</th>
                    <th>Reste à payer</th>
                    <th>Statut Global</th>
                    <th style={{ textAlign: "right", paddingRight: 24 }}>Actions</th>
                  </tr>
                </thead>
                {loading ? (
                  <tbody>
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Chargement…</td></tr>
                  </tbody>
                ) : filteredGroups.length === 0 ? (
                  <tbody>
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Aucun élève trouvé.</td></tr>
                  </tbody>
                ) : (
                  filteredGroups.map((group) => {
                    const isExpanded = expandedUserIds.has(group.userId);
                    return (
                      <tbody key={group.userId} className="border-b border-slate-200">
                        <tr
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                          onClick={() => toggleExpandUser(group.userId)}
                        >
                          <td style={{ textAlign: "center" }}>
                            <button className="p-1 text-slate-400 hover:text-slate-700 transition-colors">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-[#0a2d26] font-bold" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              {group.userAvatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={group.userAvatar}
                                  alt={group.userName}
                                  className="w-8 h-8 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="table-avatar">{group.userName.charAt(0)}</div>
                              )}
                              <div>
                                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{group.userName}</div>
                                {group.userEmail && (
                                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{group.userEmail}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-info font-medium">
                              {group.echeances.length} échéance{group.echeances.length > 1 ? "s" : ""}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{formatFCFA(group.totalDu)}</td>
                          <td style={{ fontWeight: 600, color: group.totalPaye > 0 ? "var(--accent-success)" : "var(--text-muted)" }}>
                            {formatFCFA(group.totalPaye)}
                          </td>
                          <td style={{ fontWeight: 600, color: group.totalRestant > 0 ? "var(--accent-danger)" : "var(--accent-success)" }}>
                            {formatFCFA(group.totalRestant)}
                          </td>
                          <td>
                            <span className={`badge ${getStatutBadgeClass(group.statutGlobal)} badge-pulse`}>
                              <span className="badge-dot" />
                              {getStatutLabel(group.statutGlobal)}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", paddingRight: 20 }} onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="btn btn-ghost btn-sm text-[#0a2d26] hover:bg-[#0a2d26]/10 flex items-center gap-1"
                                onClick={() => toggleExpandUser(group.userId)}
                              >
                                {isExpanded ? "Masquer" : "Dérouler"}
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              <Link
                                href={`/dashboard/utilisateurs/${group.userId}`}
                                className="btn btn-ghost btn-sm text-indigo-600 hover:bg-indigo-50"
                              >
                                Profil →
                              </Link>
                            </div>
                          </td>
                        </tr>

                        {/* Accordion Content Row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="bg-slate-50/90 p-4 border-t border-slate-100">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                     Détail des formations & échéances pour {group.userName}
                                  </h4>
                                  <span className="text-xs text-slate-500 font-medium">
                                    {group.echeances.length} tranche(s) au total
                                  </span>
                                </div>

                                {(() => {
                                  // Regroupement des échéances de l'élève par formation
                                  const echeancesByFormation = group.echeances.reduce((acc: Record<string, { formationId: string; formationTitre: string; echeances: typeof group.echeances; totalDu: number; totalPaye: number; restant: number }>, ech) => {
                                    const fId = ech.formationId || ech.formation?.id || ech.formationTitre;
                                    if (!acc[fId]) {
                                      acc[fId] = {
                                        formationId: fId,
                                        formationTitre: ech.formationTitre,
                                        echeances: [],
                                        totalDu: 0,
                                        totalPaye: 0,
                                        restant: 0,
                                      };
                                    }
                                    acc[fId].echeances.push(ech);
                                    acc[fId].totalDu += ech.montantDu;
                                    acc[fId].totalPaye += ech.montantPaye;
                                    acc[fId].restant += ech.restant;
                                    return acc;
                                  }, {});

                                  const formationGroups = Object.values(echeancesByFormation);

                                  return formationGroups.map((fGroup) => {
                                    const key = `${group.userId}_${fGroup.formationId}`;
                                    const isFOpen = expandedFormationKeys[key] ?? false;
                                    const isFullyPaid = fGroup.restant === 0 && fGroup.totalDu > 0;
                                    const isPartiallyPaid = fGroup.totalPaye > 0 && fGroup.restant > 0;
                                    const hasRetard = fGroup.echeances.some((e) => e.statut === "enRetard");

                                    return (
                                      <div key={fGroup.formationId} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                        {/* En-tête de formation de l'élève */}
                                        <div
                                          className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                                          onClick={() => toggleExpandFormation(key)}
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <button
                                              type="button"
                                              className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
                                            >
                                              {isFOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>
                                            <div>
                                              <span className="font-bold text-slate-900 text-sm">{fGroup.formationTitre}</span>
                                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                                {fGroup.echeances.length} échéance{fGroup.echeances.length > 1 ? "s" : ""}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-4 text-xs shrink-0">
                                            <div>
                                              <span className="text-slate-500">Dû :</span> <strong className="text-slate-900">{formatFCFA(fGroup.totalDu)}</strong>
                                            </div>
                                            <div>
                                              <span className="text-slate-500">Payé :</span> <strong className="text-emerald-600">{formatFCFA(fGroup.totalPaye)}</strong>
                                              {fGroup.restant > 0 && (
                                                <span className="text-red-500 ml-1 font-bold">(Reste {formatFCFA(fGroup.restant)})</span>
                                              )}
                                            </div>
                                            <div>
                                              {isFullyPaid ? (
                                                <span className="badge badge-success text-[10px]">Payé</span>
                                              ) : hasRetard ? (
                                                <span className="badge badge-danger text-[10px]">En retard</span>
                                              ) : isPartiallyPaid ? (
                                                <span className="badge badge-warning text-[10px]">Partiel</span>
                                              ) : (
                                                <span className="badge badge-info text-[10px]">À venir</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Déploiement des échéances de cette formation */}
                                        {isFOpen && (
                                          <div className="border-t border-slate-100 bg-slate-50/50 p-2.5">
                                            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                                              <table className="w-full text-xs">
                                                <thead>
                                                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                                    <th className="py-2 px-3 text-left font-semibold">Échéance</th>
                                                    <th className="py-2 px-3 text-left font-semibold">Montant Dû</th>
                                                    <th className="py-2 px-3 text-left font-semibold">Montant Payé</th>
                                                    <th className="py-2 px-3 text-left font-semibold">Restant</th>
                                                    <th className="py-2 px-3 text-left font-semibold">Statut</th>
                                                    <th className="py-2 px-3 text-left font-semibold">Date Limite</th>
                                                    <th className="py-2 px-3 text-right font-semibold">Action</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                  {fGroup.echeances.map((ech) => (
                                                    <tr key={ech.id} className="hover:bg-slate-50/80 transition-colors">
                                                      <td className="py-2 px-3 font-semibold text-slate-800">{ech.libelle}</td>
                                                      <td className="py-2 px-3 font-medium text-slate-900">{formatFCFA(ech.montantDu)}</td>
                                                      <td className="py-2 px-3 font-bold text-emerald-600">{formatFCFA(ech.montantPaye)}</td>
                                                      <td className={`py-2 px-3 font-bold ${ech.restant > 0 ? "text-red-500" : "text-emerald-600"}`}>
                                                        {formatFCFA(ech.restant)}
                                                      </td>
                                                      <td className="py-2 px-3">
                                                        <span className={`badge ${getStatutBadgeClass(ech.statut)} text-[11px]`}>
                                                          {getStatutLabel(ech.statut)}
                                                        </span>
                                                      </td>
                                                      <td className="py-2 px-3 text-slate-500">{formatDate(ech.dateEcheance)}</td>
                                                      <td className="py-2 px-3 text-right">
                                                        <button
                                                          className="btn btn-ghost btn-xs text-indigo-600 hover:bg-indigo-50 inline-flex items-center gap-1 font-semibold"
                                                          onClick={() => {
                                                            setHistoryModalEcheanceId(ech.id);
                                                            setNewPaymentAmount(String(ech.restant));
                                                            setNewPaymentNote("");
                                                          }}
                                                        >
                                                          <History className="w-3.5 h-3.5" />
                                                          Gérer
                                                        </button>
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    );
                  })
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Modal d'historique de paiement */}
        <Dialog open={!!historyModalEcheanceId} onOpenChange={(open) => { 
          if (!open) {
            setHistoryModalEcheanceId(null); 
            setEditingPaymentId(null);
          }
        }}>
          <DialogContent className="sm:max-w-[600px] bg-slate-50 p-0 overflow-hidden flex flex-col max-h-[85vh]">
            {activeEcheance && (
              <>
                <div className="bg-white p-6 border-b">
                  <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      Historique des paiements
                    </DialogTitle>
                    <DialogDescription className="text-sm mt-1">
                      Gérez les paiements pour <strong className="text-slate-900">{activeEcheance.userName}</strong>.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-3 gap-4 mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">Montant dû</div>
                      <div className="text-lg font-bold text-slate-900">{formatFCFA(activeEcheance.montantDu)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">Déjà payé</div>
                      <div className="text-lg font-bold text-emerald-600">{formatFCFA(activeEcheance.montantPaye)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">Restant</div>
                      <div className="text-lg font-bold text-red-500">{formatFCFA(activeEcheance.restant)}</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                  <h4 className="text-sm font-semibold text-slate-900 mb-4">Paiements enregistrés</h4>

                  {activeEcheance.paiements.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-dashed">
                      Aucun paiement n&apos;a été enregistré pour cette échéance.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...activeEcheance.paiements].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                          {editingPaymentId === p.id ? (
                            <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 mr-2">
                              <input
                                type="number"
                                className="w-full sm:w-1/3 rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                                value={editPaymentAmount}
                                onChange={(e) => setEditPaymentAmount(e.target.value)}
                              />
                              <input
                                type="text"
                                className="w-full sm:flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                                placeholder="Note"
                                value={editPaymentNote}
                                onChange={(e) => setEditPaymentNote(e.target.value)}
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-slate-900">{formatFCFA(p.montant)}</div>
                              <div className="text-xs text-slate-500">Le {formatDateTime(p.date)}{p.note ? ` · ${p.note}` : ""}</div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 shrink-0">
                            {editingPaymentId === p.id ? (
                              <>
                                <button
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                  onClick={() => handleSaveEdit(activeEcheance.id)}
                                  title="Enregistrer"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-1.5 text-slate-500 hover:bg-slate-50 rounded-md transition-colors"
                                  onClick={() => setEditingPaymentId(null)}
                                  title="Annuler"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                  onClick={() => {
                                    setEditingPaymentId(p.id);
                                    setEditPaymentAmount(String(p.montant));
                                    setEditPaymentNote(p.note || "");
                                  }}
                                  title="Modifier ce paiement"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                  onClick={() => handleDeletePayment(activeEcheance.id, p.id, p.montant)}
                                  title="Supprimer ce paiement"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeEcheance.restant > 0 && (
                    <div className="mt-8 border-t pt-6">
                      <h4 className="text-sm font-semibold text-slate-900 mb-4">Ajouter un paiement</h4>
                      <div className="flex flex-col sm:flex-row items-end gap-3">
                        <div className="w-full sm:flex-1">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Montant (FCFA)</label>
                          <input
                            type="number"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                            value={newPaymentAmount}
                            onChange={(e) => setNewPaymentAmount(e.target.value)}
                            max={activeEcheance.restant}
                          />
                        </div>
                        <div className="w-full sm:flex-1">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Note (optionnel)</label>
                          <input
                            type="text"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                            placeholder="ex: espèces, virement…"
                            value={newPaymentNote}
                            onChange={(e) => setNewPaymentNote(e.target.value)}
                          />
                        </div>
                        <button
                          className="w-full sm:w-auto bg-[#0a2d26] hover:bg-[#0a2d26]/90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex justify-center items-center gap-2 h-[38px] disabled:opacity-50"
                          onClick={handleAddPayment}
                          disabled={busy || !newPaymentAmount || Number(newPaymentAmount) <= 0}
                        >
                          <Plus className="w-4 h-4" />
                          Ajouter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
