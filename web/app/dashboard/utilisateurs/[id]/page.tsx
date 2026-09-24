"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  formatFCFA,
  formatDate,
  formatDateTime,
  getStatutPaiement,
  getStatutLabel,
  getStatutBadgeClass,
  getAdmissionLabel,
  getAdmissionBadgeClass,
} from "@/app/lib/mock-data";
import { usersApi, formationsApi, paiementsApi } from "@/app/lib/api";
import { useSession } from "@/app/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import InfoBanner from "@/app/components/InfoBanner";
import { Plus, History, Trash2, Edit2, Check, X, ChevronDown, ChevronRight, KeyRound, Eye, EyeOff } from "lucide-react";

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [echeancesData, setEcheancesData] = useState<any[]>([]);
  const [candidatures, setCandidatures] = useState<any[]>([]);
  const [allFormations, setAllFormations] = useState<any[]>([]);

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  const [historyModalEcheanceId, setHistoryModalEcheanceId] = useState<string | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentNote, setNewPaymentNote] = useState("");
  const [busy, setBusy] = useState(false);

  // ── Réinitialisation du mot de passe (administrateurs uniquement) ──
  const { data: session } = useSession();
  const roleConnecte = (session?.user as { role?: string } | undefined)?.role?.toUpperCase();
  const isAdmin = roleConnecte === "ADMIN" || roleConnecte === "SUPER_ADMIN";
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const handleSetPassword = async () => {
    if (pwdBusy) return;
    setPwdError(null);
    if (newPwd.length < 8) {
      setPwdError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setPwdBusy(true);
    try {
      await usersApi.setPassword(id, newPwd);
      setPwdSuccess(true);
      setNewPwd("");
      setConfirmPwd("");
    } catch (err: unknown) {
      setPwdError(
        err instanceof Error
          ? err.message
          : "Échec du changement de mot de passe.",
      );
    } finally {
      setPwdBusy(false);
    }
  };

  const openPwdModal = () => {
    setNewPwd("");
    setConfirmPwd("");
    setShowPwd(false);
    setPwdError(null);
    setPwdSuccess(false);
    setShowPwdModal(true);
  };

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentNote, setEditPaymentNote] = useState("");

  const [formationSearch, setFormationSearch] = useState("");
  const [formationStatus, setFormationStatus] = useState("");
  const [candidatureSearch, setCandidatureSearch] = useState("");
  const [candidatureStatus, setCandidatureStatus] = useState("");
  const [echeanceSearch, setEcheanceSearch] = useState("");
  const [echeanceStatus, setEcheanceStatus] = useState("");

  const [expandedFormations, setExpandedFormations] = useState<Record<string, boolean>>({});

  const toggleFormationExpand = (fId: string) => {
    setExpandedFormations((prev) => ({
      ...prev,
      [fId]: prev[fId] === undefined ? false : !prev[fId],
    }));
  };

  const loadInscriptionsAndPaiements = useCallback(async () => {
    const [ins, ech] = await Promise.all([
      usersApi.inscriptions(id).catch(() => []),
      paiementsApi.list({ userId: id }).catch(() => []),
    ]);
    setInscriptions(ins);
    setEcheancesData(ech);
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const [u, forms, cands] = await Promise.all([
          usersApi.get(id),
          formationsApi.list().catch(() => []),
          usersApi.candidatures(id).catch(() => []),
        ]);
        setUser(u);
        setAllFormations(forms);
        setCandidatures(cands);
        await loadInscriptionsAndPaiements();
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, loadInscriptionsAndPaiements]);

  if (loading) {
    return <div className="page-body"><div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Chargement…</div></div>;
  }

  if (!user) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Utilisateur introuvable</h1>
        </div>
        <div className="page-body">
          <div className="empty-state">
            <h3>Aucun utilisateur trouvé avec cet identifiant.</h3>
            <Link href="/dashboard/utilisateurs" className="btn btn-primary" style={{ marginTop: 16 }}>
              ← Retour à la liste
            </Link>
          </div>
        </div>
      </>
    );
  }

  const enrolledIds = inscriptions.map((i) => i.formationId);
  const availableFormations = allFormations.filter((f) => !enrolledIds.includes(f.id) && !f.estBourse);

  const userEcheances = echeancesData.map((e) => {
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
      formationTitre: e.formation?.titre ?? "—",
      restant,
      paiements,
    };
  });

  const totalPaye = userEcheances.reduce((s, e) => s + e.montantPaye, 0);
  const totalDu = userEcheances.reduce((s, e) => s + e.montantDu, 0);

  const filteredInscriptions = inscriptions.filter((ins) => {
    const matchSearch = (ins.formation?.titre || "").toLowerCase().includes(formationSearch.toLowerCase());
    const matchStatus = !formationStatus || ins.statut === formationStatus;
    return matchSearch && matchStatus;
  });

  const filteredCandidatures = candidatures.filter((c) => {
    const matchSearch = (c.bourse?.titre || "").toLowerCase().includes(candidatureSearch.toLowerCase());
    const matchStatus = !candidatureStatus || c.statut === candidatureStatus;
    return matchSearch && matchStatus;
  });

  const filteredEcheances = userEcheances.filter((e) => {
    const matchSearch = e.formationTitre.toLowerCase().includes(echeanceSearch.toLowerCase());
    const matchStatus = !echeanceStatus || e.statut === echeanceStatus;
    return matchSearch && matchStatus;
  });

  const echeancesGroupedByFormation = userEcheances.reduce((acc: Record<string, { formationId: string; formationTitre: string; echeances: any[]; totalDu: number; totalPaye: number; restant: number }>, e) => {
    const fId = e.formationId || e.formation?.id || e.formationTitre;
    if (!acc[fId]) {
      acc[fId] = {
        formationId: fId,
        formationTitre: e.formationTitre,
        echeances: [],
        totalDu: 0,
        totalPaye: 0,
        restant: 0,
      };
    }
    acc[fId].echeances.push(e);
    acc[fId].totalDu += e.montantDu;
    acc[fId].totalPaye += e.montantPaye;
    acc[fId].restant += e.restant;
    return acc;
  }, {});

  const groupedFormationsList = Object.values(echeancesGroupedByFormation).filter((group) => {
    const matchSearch = group.formationTitre.toLowerCase().includes(echeanceSearch.toLowerCase());
    const matchingEcheances = group.echeances.filter((e) => !echeanceStatus || e.statut === echeanceStatus);
    return matchSearch && (!echeanceStatus || matchingEcheances.length > 0);
  }).map((group) => ({
    ...group,
    echeances: echeanceStatus ? group.echeances.filter((e) => e.statut === echeanceStatus) : group.echeances,
  }));

  const handleEnroll = async () => {
    if (!selectedFormation || enrolling) return;
    setEnrolling(true);
    try {
      await usersApi.enroll(id, { formationId: selectedFormation });
      await loadInscriptionsAndPaiements();
      setShowEnrollModal(false);
      setSelectedFormation("");
    } catch {
      alert("Erreur lors de l'inscription");
    } finally {
      setEnrolling(false);
    }
  };

  const handleUpdateInscriptionStatut = async (formationId: string, newStatut: string) => {
    try {
      await usersApi.updateInscriptionStatus(id, formationId, newStatut);
      await loadInscriptionsAndPaiements();
    } catch {
      alert("Erreur lors du changement de statut de l'inscription");
    }
  };

  const handleRemoveInscription = async (formationId: string, formationTitre: string) => {
    if (!confirm(`Voulez-vous vraiment désinscrire ${user?.nom || 'cet utilisateur'} du cours "${formationTitre}" ?`)) return;
    try {
      await usersApi.removeInscription(id, formationId);
      await loadInscriptionsAndPaiements();
    } catch {
      alert("Erreur lors de la désinscription du cours");
    }
  };

  const patchEcheance = (echeanceId: string, updater: (e: any) => any) => {
    setEcheancesData((prev) => prev.map((e) => (e.id === echeanceId ? updater(e) : e)));
  };

  const handleAddPayment = async () => {
    if (!historyModalEcheanceId || busy) return;
    const amount = Number(newPaymentAmount);
    if (amount <= 0) return;
    setBusy(true);
    try {
      const created = await paiementsApi.addPaiement(historyModalEcheanceId, { montant: amount, note: newPaymentNote || undefined });
      patchEcheance(historyModalEcheanceId, (e) => ({
        ...e,
        montantPaye: (e.montantPaye ?? 0) + amount,
        datePaiement: new Date().toISOString(),
        paiements: [...(e.paiements ?? []), created],
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
      patchEcheance(echeanceId, (e) => ({
        ...e,
        montantPaye: Math.max(0, (e.montantPaye ?? 0) - montant),
        paiements: (e.paiements ?? []).filter((p: any) => p.id !== paymentId),
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleStartEdit = (p: any) => {
    setEditingPaymentId(p.id);
    setEditPaymentAmount(String(p.montant));
    setEditPaymentNote(p.note ?? "");
  };

  const handleSaveEdit = async (echeanceId: string) => {
    if (!editingPaymentId || busy) return;
    const amount = Number(editPaymentAmount);
    if (amount <= 0) return;
    setBusy(true);
    try {
      await paiementsApi.updatePaiement(editingPaymentId, { montant: amount, note: editPaymentNote || undefined });
      patchEcheance(echeanceId, (e) => {
        const old = (e.paiements ?? []).find((p: any) => p.id === editingPaymentId);
        const diff = amount - (old?.montant ?? 0);
        return {
          ...e,
          montantPaye: Math.max(0, (e.montantPaye ?? 0) + diff),
          paiements: (e.paiements ?? []).map((p: any) => (p.id === editingPaymentId ? { ...p, montant: amount, note: editPaymentNote } : p)),
        };
      });
      setEditingPaymentId(null);
    } finally {
      setBusy(false);
    }
  };

  const activeEcheance = historyModalEcheanceId ? userEcheances.find((e) => e.id === historyModalEcheanceId) : null;

  const getRoleBadge = (role?: string) => {
    const r = (role || "ETUDIANT").toUpperCase();
    switch (r) {
      case "SUPER_ADMIN":
        return <span className="badge badge-danger font-semibold">Super Admin</span>;
      case "ADMIN":
        return <span className="badge badge-purple font-semibold">Administrateur</span>;
      case "FORMATEUR":
        return <span className="badge badge-info font-semibold">Formateur</span>;
      case "STAFF":
        return <span className="badge badge-warning font-semibold">Staff</span>;
      case "ETUDIANT":
      default:
        return <span className="badge badge-neutral font-semibold">Étudiant</span>;
    }
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard/utilisateurs" className="btn-icon" style={{ textDecoration: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {user.avatarUrl || user.image ? (
                <img
                  src={user.avatarUrl || user.image}
                  alt={user.nom || user.name || "Avatar"}
                  style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-color, #e5e7eb)" }}
                />
              ) : (
                <div className="table-avatar" style={{ width: 44, height: 44, fontSize: 18 }}>
                  {(user.nom || user.name || "?").charAt(0)}
                </div>
              )}
              <h1 className="page-title">{user.nom || user.name}</h1>
              {getRoleBadge(user.role)}
            </div>
            <p className="page-subtitle">{user.email}{user.telephone ? ` · ${user.telephone}` : ""}</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <InfoBanner title="Guide de Gestion de l'Élève & Accès aux Cours">
          <strong>Gérer l'accès aux cours :</strong> Sur chaque carte de formation, utilisez le menu déroulant pour changer le statut (<em>Actif (En cours)</em>, <em>Accès Suspendu</em>, <em>Terminé</em> ou <em>Abandonné</em>). La suspension masque le cours sur l&apos;application mobile de l&apos;élève.<br />
          <strong>Désinscrire de ce cours :</strong> Cliquez sur l&apos;icône de corbeille 🗑️ sur la carte de la formation pour retirer définitivement l&apos;élève.<br />
          <strong>Suivi des Paiements & Reçus :</strong> Dans la section en bas, cliquez sur <em>&quot;Gérer&quot;</em> pour saisir un règlement (espèces, virement, Mobile Money), modifier ou supprimer un versement.
        </InfoBanner>

        {/* Sécurité : réinitialisation du mot de passe (administrateurs) */}
        {isAdmin && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              padding: 16,
              marginBottom: 16,
              border: "1px solid var(--border)",
              borderRadius: 14,
              background: "var(--surface)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(234,179,8,0.15)",
                  color: "#CA8A04",
                  flexShrink: 0,
                }}
              >
                <KeyRound size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  Mot de passe du compte
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Définissez un nouveau mot de passe pour cet utilisateur (ex. après un oubli).
                </div>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={openPwdModal}>
              <KeyRound size={16} /> Changer le mot de passe
            </button>
          </div>
        )}
        {/* Info cards */}
        <div className="stats-grid stagger">
          <div className="stat-card">
            <div className="stat-icon teal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4" /><path d="M5.5 21a7.5 7.5 0 0 1 13 0" /></svg>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: 20 }}>{user.actif ? "Actif" : "Inactif"}</div>
              <div className="stat-label">Statut ({getRoleBadge(user.role)})</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: 20 }}>{inscriptions.length}</div>
              <div className="stat-label">Formation{inscriptions.length > 1 ? "s" : ""} inscrite{inscriptions.length > 1 ? "s" : ""}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: 20 }}>{formatFCFA(totalPaye)}</div>
              <div className="stat-label">Total payé sur {formatFCFA(totalDu)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: 20 }}>{formatDate(user.createdAt ?? user.dateInscription)}</div>
              <div className="stat-label">Profil créé le</div>
            </div>
          </div>
        </div>

        {/* Formations */}
        <div className="card" style={{ marginTop: 24, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Formations inscrites</h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0 0" }}>Gérez les accès aux cours (Actif/Suspendu) ou désinscrivez l&apos;élève.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="text" placeholder="Rechercher..." className="form-select" style={{ minWidth: 150 }} value={formationSearch} onChange={(e) => setFormationSearch(e.target.value)} />
              <select className="form-select" value={formationStatus} onChange={(e) => setFormationStatus(e.target.value)}>
                <option value="">Tous statuts</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
                <option value="abandonne">Abandonné</option>
              </select>
              <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-[#0a2d26] text-white hover:bg-[#0a2d26]/90 h-9 px-4 py-2" onClick={() => setShowEnrollModal(true)}>
                + Nouvelle inscription
              </button>
            </div>
          </div>

          {filteredInscriptions.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", border: "1px dashed var(--border-color)", borderRadius: 8, color: "var(--text-muted)" }}>
              Aucune formation trouvée.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {filteredInscriptions.map((ins) => (
                <div key={ins.id} style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 16, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{ins.formation?.titre ?? "—"}</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2, marginBottom: 8 }}>
                        {ins.formation?.niveau ?? ""}
                      </div>
                    </div>
                    <button
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Désinscrire de ce cours"
                      onClick={() => handleRemoveInscription(ins.formationId, ins.formation?.titre || "")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    {ins.formation?.dureeMois != null && <span className="badge badge-info">{ins.formation.dureeMois} mois</span>}
                    {ins.formation?.estBourse ? (
                      <span className="badge badge-purple">Bourse</span>
                    ) : ins.formation?.prixMensualite != null ? (
                      <span className="badge badge-neutral">{formatFCFA(ins.formation.prixMensualite)}/mois</span>
                    ) : null}
                    <span className={`badge ${ins.statut === "en_cours" ? "badge-success" : ins.statut === "suspendu" ? "badge-danger" : ins.statut === "termine" ? "badge-neutral" : "badge-amber"}`}>
                      {ins.statut === "en_cours" ? "En cours" : ins.statut === "suspendu" ? "Accès Suspendu" : ins.statut === "termine" ? "Terminé" : "Abandonné"}
                    </span>
                  </div>

                  <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px dashed var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Inscrit(e) le : <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatDate(ins.dateInscription)}</span>
                    </div>

                    <select
                      className="text-xs rounded border border-slate-300 bg-white px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0a2d26] cursor-pointer"
                      value={ins.statut}
                      onChange={(e) => handleUpdateInscriptionStatut(ins.formationId, e.target.value)}
                    >
                      <option value="en_cours">Actif (En cours)</option>
                      <option value="suspendu">Accès Suspendu</option>
                      <option value="termine">Terminé</option>
                      <option value="abandonne">Abandonné</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Candidatures aux bourses */}
        {candidatures.length > 0 && (
          <div className="card" style={{ marginTop: 24, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Candidatures aux bourses</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input type="text" placeholder="Rechercher..." className="form-select" style={{ minWidth: 150 }} value={candidatureSearch} onChange={(e) => setCandidatureSearch(e.target.value)} />
                <select className="form-select" value={candidatureStatus} onChange={(e) => setCandidatureStatus(e.target.value)}>
                  <option value="">Tous statuts</option>
                  <option value="enAttente">En attente</option>
                  <option value="admis">Admis</option>
                  <option value="refuse">Refusé</option>
                </select>
              </div>
            </div>

            {filteredCandidatures.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", border: "1px dashed var(--border-color)", borderRadius: 8, color: "var(--text-muted)" }}>
                Aucune candidature trouvée.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                {filteredCandidatures.map((c) => (
                  <div key={c.id} style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.bourse?.titre}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, marginBottom: 12 }}>
                      Postulé le : {formatDate(c.dateDepot)}
                    </div>
                    <div>
                      <span className={`badge ${getAdmissionBadgeClass(c.statut)}`}>
                        <span className="badge-dot" />
                        {getAdmissionLabel(c.statut)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payment history */}
        <div className="table-container" style={{ marginTop: 24 }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Historique des échéances et paiements</h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0 0" }}>Échéances et paiements regroupés par formation. Cliquez sur une formation pour déplier ses détails.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="text" placeholder="Rechercher par formation..." className="form-select" style={{ minWidth: 200 }} value={echeanceSearch} onChange={(e) => setEcheanceSearch(e.target.value)} />
              <select className="form-select" value={echeanceStatus} onChange={(e) => setEcheanceStatus(e.target.value)}>
                <option value="">Tous statuts</option>
                <option value="paye">Payé</option>
                <option value="partiel">Partiel</option>
                <option value="aVenir">À venir</option>
                <option value="enRetard">En retard</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {groupedFormationsList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                Aucune échéance trouvée.
              </div>
            ) : (
              groupedFormationsList.map((group) => {
                const isOpen = expandedFormations[group.formationId] ?? false;
                const totalDu = group.totalDu;
                const totalPaye = group.totalPaye;
                const restant = group.restant;
                const isFullyPaid = restant === 0 && totalDu > 0;
                const isPartiallyPaid = totalPaye > 0 && restant > 0;
                const hasRetard = group.echeances.some((e) => e.statut === "enRetard");

                return (
                  <div key={group.formationId} className="bg-white">
                    {/* Header formation row (Clickable accordion) */}
                    <div
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                      onClick={() => toggleFormationExpand(group.formationId)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
                        >
                          {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                            <span>{group.formationTitre}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              {group.echeances.length} échéance{group.echeances.length > 1 ? "s" : ""}
                            </span>
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        <div className="hidden md:block text-right">
                          <div className="text-xs text-slate-500 font-medium">Montant dû</div>
                          <div className="text-sm font-semibold text-slate-900">{formatFCFA(totalDu)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500 font-medium">Payé / Restant</div>
                          <div className="text-sm font-semibold text-emerald-600">
                            {formatFCFA(totalPaye)}
                            {restant > 0 && (
                              <span className="text-red-500 ml-1.5 font-bold">
                                (Reste {formatFCFA(restant)})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isFullyPaid ? (
                            <span className="badge badge-success">
                              <span className="badge-dot" /> Payé
                            </span>
                          ) : hasRetard ? (
                            <span className="badge badge-danger">
                              <span className="badge-dot" /> En retard
                            </span>
                          ) : isPartiallyPaid ? (
                            <span className="badge badge-warning">
                              <span className="badge-dot" /> Partiel
                            </span>
                          ) : (
                            <span className="badge badge-info">
                              <span className="badge-dot" /> À venir
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible detail table */}
                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-3 sm:p-4">
                        <div className="table-responsive bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <th>Échéance</th>
                                <th>Montant dû</th>
                                <th>Payé</th>
                                <th>Restant</th>
                                <th>Statut</th>
                                <th>Date limite</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                              {group.echeances.map((e) => (
                                <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="font-semibold text-slate-900">{e.libelle}</td>
                                  <td>{formatFCFA(e.montantDu)}</td>
                                  <td className="font-semibold text-emerald-600">{formatFCFA(e.montantPaye)}</td>
                                  <td className={`font-semibold ${e.restant > 0 ? "text-red-500" : "text-emerald-600"}`}>
                                    {formatFCFA(e.restant)}
                                  </td>
                                  <td>
                                    <span className={`badge ${getStatutBadgeClass(e.statut)}`}>
                                      <span className="badge-dot" />
                                      {getStatutLabel(e.statut)}
                                    </span>
                                  </td>
                                  <td className="text-slate-500 text-xs">
                                    {formatDate(e.dateEcheance)}
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    <button
                                      className="btn btn-ghost btn-sm text-indigo-600 hover:bg-indigo-50 inline-flex items-center gap-1.5"
                                      onClick={() => {
                                        setHistoryModalEcheanceId(e.id);
                                        setNewPaymentAmount(String(e.restant));
                                        setNewPaymentNote("");
                                      }}
                                    >
                                      <History className="w-4 h-4" />
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
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Inscription */}
      <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Inscrire à une formation</DialogTitle>
            <DialogDescription>
              Sélectionnez la formation à laquelle inscrire <strong>{user.nom}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Formation</label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                value={selectedFormation}
                onChange={(e) => setSelectedFormation(e.target.value)}
              >
                <option value="">-- Choisissez une formation --</option>
                {availableFormations.map((f) => (
                  <option key={f.id} value={f.id}>{f.titre}</option>
                ))}
              </select>
              {availableFormations.length === 0 && (
                <p className="text-xs text-red-500">L&apos;élève est déjà inscrit à toutes les formations disponibles.</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t mt-2">
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 h-10 px-4 py-2" onClick={() => setShowEnrollModal(false)}>
              Annuler
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-[#0a2d26] text-white hover:bg-[#0a2d26]/90 h-10 px-4 py-2 disabled:opacity-50"
              onClick={handleEnroll}
              disabled={!selectedFormation || enrolling}
            >
              {enrolling ? "Inscription..." : "Inscrire l'élève"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de réinitialisation du mot de passe (administrateurs) */}
      <Dialog open={showPwdModal} onOpenChange={(open) => { if (!open) setShowPwdModal(false); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={18} /> Changer le mot de passe
            </DialogTitle>
            <DialogDescription>
              Définir un nouveau mot de passe pour <strong>{user.nom || user.name}</strong> ({user.email}).
            </DialogDescription>
          </DialogHeader>

          {pwdSuccess ? (
            <div style={{ padding: "8px 0" }}>
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(16,185,129,0.12)",
                  color: "#047857",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Check size={18} /> Mot de passe mis à jour. Communiquez-le à l&apos;utilisateur en toute sécurité.
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button className="btn btn-primary" onClick={() => setShowPwdModal(false)}>
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
              <div>
                <label className="form-label" style={{ fontSize: 12 }}>Nouveau mot de passe</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="form-input"
                    type={showPwd ? "text" : "password"}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Au moins 8 caractères"
                    autoComplete="new-password"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? "Masquer" : "Afficher"}
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
                    }}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 12 }}>Confirmer le mot de passe</label>
                <input
                  className="form-input"
                  type={showPwd ? "text" : "password"}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Retapez le mot de passe"
                  autoComplete="new-password"
                />
              </div>

              {pwdError && (
                <div style={{ fontSize: 13, color: "#DC2626", fontWeight: 500 }}>{pwdError}</div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button className="btn btn-ghost" onClick={() => setShowPwdModal(false)} disabled={pwdBusy}>
                  Annuler
                </button>
                <button className="btn btn-primary" onClick={handleSetPassword} disabled={pwdBusy}>
                  {pwdBusy ? "Enregistrement…" : "Définir le mot de passe"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal d'historique de paiement */}
      <Dialog open={!!historyModalEcheanceId} onOpenChange={(open) => { if (!open) { setHistoryModalEcheanceId(null); setEditingPaymentId(null); } }}>
        <DialogContent className="sm:max-w-[600px] bg-slate-50 p-0 overflow-hidden flex flex-col max-h-[85vh]">
          {activeEcheance && (
            <>
              <div className="bg-white p-6 border-b">
                <DialogHeader>
                  <DialogTitle className="text-xl flex items-center gap-2">Historique des paiements</DialogTitle>
                  <DialogDescription className="text-sm mt-1">
                    Gérez les paiements pour l&apos;échéance <strong className="text-slate-900">{activeEcheance.libelle}</strong>.
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
                              placeholder="Note"
                              className="w-full sm:flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
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
                              <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" onClick={() => handleSaveEdit(activeEcheance.id)} title="Enregistrer" disabled={busy}>
                                <Check className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 text-slate-500 hover:bg-slate-50 rounded-md transition-colors" onClick={() => setEditingPaymentId(null)} title="Annuler">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" onClick={() => handleStartEdit(p)} title="Modifier ce paiement">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" onClick={() => handleDeletePayment(activeEcheance.id, p.id, p.montant)} title="Supprimer ce paiement">
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
                        <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26]" value={newPaymentAmount} onChange={(e) => setNewPaymentAmount(e.target.value)} max={activeEcheance.restant} />
                      </div>
                      <div className="w-full sm:flex-1">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Note (optionnel)</label>
                        <input type="text" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2d26]" placeholder="ex: espèces…" value={newPaymentNote} onChange={(e) => setNewPaymentNote(e.target.value)} />
                      </div>
                      <button className="w-full sm:w-auto bg-[#0a2d26] hover:bg-[#0a2d26]/90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex justify-center items-center gap-2 h-[38px] disabled:opacity-50" onClick={handleAddPayment} disabled={busy || !newPaymentAmount || Number(newPaymentAmount) <= 0}>
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
    </>
  );
}
