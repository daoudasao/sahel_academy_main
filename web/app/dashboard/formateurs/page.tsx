"use client";

import InfoBanner from "@/app/components/InfoBanner";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useFormateurs } from "@/app/context/FormateursContext";
import { salaireTotalVerse, formatFCFA } from "@/app/lib/mock-data";
import { formationsApi, usersApi, departementsApi, paiementsApi } from "@/app/lib/api";
import { authClient } from "@/app/lib/auth-client";
import { ChevronDown, Check, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";

const initiale = (nom: string) => nom.replace(/^(M\.|Mme|Mr\.)\s*/, "").charAt(0).toUpperCase();

type ProfForm = { id?: string; nom: string; email: string; telephone: string; specialite: string[]; salaireMensuel: string; actif: boolean; userId?: string; createAccount?: boolean; motDePasse?: string };
const profVide: ProfForm = { nom: "", email: "", telephone: "", specialite: [], salaireMensuel: "", actif: true };

export default function FormateursPage() {
  const { formateurs, salaires, addFormateur, updateFormateur, deleteFormateur } = useFormateurs();
  const [search, setSearch] = useState("");
  const [profForm, setProfForm] = useState<ProfForm | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formationsList, setFormationsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [departementsList, setDepartementsList] = useState<any[]>([]);
  const [echeancesList, setEcheancesList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [specialiteOpen, setSpecialiteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    Promise.all([
      formationsApi.list(),
      usersApi.list(),
      departementsApi.list(),
      paiementsApi.list(),
    ]).then(([forms, users, depts, echs]) => {
      setFormationsList(forms || []);
      setUsersList(users || []);
      setDepartementsList(depts || []);
      setEcheancesList(echs || []);
    }).catch(() => {});
  }, []);

  const coursDe = (formateurId: string) => formationsList.filter((f) => (f.formateurId ?? f.formateur?.id) === formateurId);

  const calcFormateurStats = (formateurId: string) => {
    const cours = coursDe(formateurId);
    let totalEncaissements = 0;
    let gainFormateur = 0;

    for (const c of cours) {
      const echsCourse = echeancesList.filter((e) => e.formationId === c.id);
      const encCourse = echsCourse.reduce((s, e) => {
        const p = e.montantPaye ?? (e.paiements ?? []).reduce((sum: number, x: any) => sum + x.montant, 0);
        return s + p;
      }, 0);
      const pct = c.pourcentageFormateur ?? 30;
      totalEncaissements += encCourse;
      gainFormateur += Math.round(encCourse * (pct / 100));
    }

    return {
      coursCount: cours.length,
      totalEncaissements,
      gainFormateur,
      partCentre: totalEncaissements - gainFormateur,
    };
  };

  const saveProf = async () => {
    if (!profForm || !profForm.nom.trim() || submitting) return;
    setSubmitting(true);
    try {
      let finalUserId = profForm.userId;

      if (profForm.createAccount && !profForm.id) {
        if (!profForm.email || !profForm.motDePasse) {
          throw new Error("Email et mot de passe requis pour créer un compte.");
        }
        const { data, error } = await authClient.admin.createUser({
          name: profForm.nom.trim(),
          email: profForm.email,
          password: profForm.motDePasse,
          role: "FORMATEUR" as any,
        });
        if (error) {
          throw new Error(error.message || "Erreur lors de la création du compte.");
        }
        if (data && data.user && data.user.id) {
          finalUserId = data.user.id;
        }
      }

      const salaire = Math.max(0, Number(profForm.salaireMensuel) || 0);
      const data = {
        nom: profForm.nom.trim(),
        email: profForm.email || undefined,
        telephone: profForm.telephone || undefined,
        specialite: profForm.specialite.length > 0 ? profForm.specialite.join(', ') : undefined,
        salaireMensuel: salaire,
        actif: profForm.actif,
        userId: finalUserId,
      };
      if (profForm.id) {
        await updateFormateur(profForm.id, data);
        showToast("Le formateur a été modifié avec succès !");
      } else {
        await addFormateur(data);
        showToast("Le formateur a été ajouté avec succès !");
      }
      setProfForm(null);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Une erreur est survenue.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const importUser = (userId: string) => {
    const u = usersList.find((x) => x.id === userId);
    if (!u || !profForm) return;
    setProfForm({ ...profForm, nom: u.nom, email: u.email, telephone: u.telephone, userId: u.id });
  };

  const filtered = formateurs.filter((f) =>
    f.nom.toLowerCase().includes(search.toLowerCase()) || (f.specialite || "").toLowerCase().includes(search.toLowerCase())
  );

  const nbActifs = formateurs.filter((f) => f.actif).length;

  let grandTotalEncaissements = 0;
  let grandTotalGainsFormateurs = 0;
  let grandTotalPartCentre = 0;

  formateurs.forEach((f) => {
    const stats = calcFormateurStats(f.id);
    grandTotalEncaissements += stats.totalEncaissements;
    grandTotalGainsFormateurs += stats.gainFormateur;
    grandTotalPartCentre += stats.partCentre;
  });

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Compact Green Header */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-[#ffffff] shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <span>Corps Pédagogique</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Gestion des Formateurs & Rémunération
            </h1>
            <p className="text-xs text-emerald-100/75 leading-relaxed">
              Suivi des partages de revenus (%) et des encaissements par formateur.
            </p>
          </div>

          <div className="w-full sm:w-auto">
            <button
              onClick={() => setProfForm({ ...profVide })}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0a2d26] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              + Ajouter un formateur
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        <InfoBanner title="Guide de Rémunération des Formateurs (Par Pourcentage)">
          <strong>Principe de rémunération :</strong> Les formateurs perçoivent un pourcentage négocié sur les encaissements réels (frais d&apos;inscription + mensualités) générés par les élèves de leurs cours.<br />
          <strong>Configuration :</strong> Définissez le pourcentage du formateur (ex: 30% Formateur / 70% Centre) lors de la création ou modification d&apos;une <strong>Formation</strong>.<br />
          <strong>Calcul automatique en temps réel :</strong> Chaque versement d&apos;élève enregistré augmente automatiquement le gain accumulé du formateur.
        </InfoBanner>

        {/* Stats */}
        <div className="stats-grid stagger" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></div>
            <div><div style={{ fontSize: 19, fontWeight: 700 }}>{nbActifs}</div><div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Formateurs actifs</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg></div>
            <div><div style={{ fontSize: 19, fontWeight: 700 }}>{formatFCFA(grandTotalEncaissements)}</div><div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Total encaissements reçus</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
            <div><div style={{ fontSize: 19, fontWeight: 700 }}>{formatFCFA(grandTotalGainsFormateurs)}</div><div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Total Gains Formateurs</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg></div>
            <div><div style={{ fontSize: 19, fontWeight: 700 }}>{formatFCFA(grandTotalPartCentre)}</div><div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Total Part du Centre</div></div>
          </div>
        </div>

        {/* Table */}
        <div className="table-container animate-in">
          <div className="table-toolbar">
            <div className="table-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input type="text" placeholder="Rechercher un formateur..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{filtered.length} formateur{filtered.length > 1 ? "s" : ""}</span>
          </div>

          <div className="table-responsive">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Formateur</th>
                  <th>Spécialité</th>
                  <th>Encaissements Cours</th>
                  <th>Gain Formateur</th>
                  <th>Part du Centre</th>
                  <th>Cours</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const stats = calcFormateurStats(f.id);
                  return (
                    <tr key={f.id}>
                      <td>
                        <Link href={`/dashboard/formateurs/${f.id}`} style={{ display: "flex", alignItems: "center", gap: 10, color: "inherit", textDecoration: "none" }} className="hover:underline">
                          {(f as any).avatarUrl || (f as any).image || (f as any).photoUrl || (f as any).user?.avatarUrl || (f as any).user?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={(f as any).avatarUrl || (f as any).image || (f as any).photoUrl || (f as any).user?.avatarUrl || (f as any).user?.image}
                              alt={f.nom || "Avatar"}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="table-avatar">{initiale(f.nom)}</div>
                          )}
                          <div>
                            <span style={{ fontWeight: 600 }}>{f.nom}</span>
                            {f.userId && <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700">Compte Utilisateur</span>}
                          </div>
                        </Link>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{f.specialite || "—"}</td>
                      <td style={{ fontWeight: 600 }}>{formatFCFA(stats.totalEncaissements)}</td>
                      <td style={{ fontWeight: 700, color: "var(--accent-success)" }}>{formatFCFA(stats.gainFormateur)}</td>
                      <td style={{ fontWeight: 600, color: "var(--text-muted)" }}>{formatFCFA(stats.partCentre)}</td>
                      <td><span className="badge badge-info">{stats.coursCount} cours</span></td>
                      <td>
                        <div className="flex gap-2">
                          <Link href={`/dashboard/formateurs/${f.id}`} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#10b981]/10 text-[#059669] hover:bg-[#10b981]/20 transition-colors">Détail & Gains</Link>
                          <button onClick={() => setProfForm({ id: f.id, nom: f.nom, email: f.email || "", telephone: f.telephone || "", specialite: f.specialite ? f.specialite.split(',').map(s => s.trim()) : [], salaireMensuel: String(f.salaireMensuel), actif: f.actif, userId: f.userId })} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">Modifier</button>
                          <button onClick={() => setDeleteId(f.id)} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors">Suppr.</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Aucun formateur.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal : ajouter / modifier un formateur ── */}
      <Dialog open={!!profForm} onOpenChange={(o) => !o && setProfForm(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{profForm?.id ? "Modifier le formateur" : "Ajouter un formateur"}</DialogTitle>
            <DialogDescription>Renseignez les informations et le salaire mensuel de base.</DialogDescription>
          </DialogHeader>
          {profForm && (
            <div className="grid gap-4 py-2">
              {!profForm.id && (
                <div className="space-y-4 mb-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="accountMode" className="w-4 h-4 text-emerald-600" checked={!profForm.createAccount} onChange={() => setProfForm({ ...profForm, createAccount: false, userId: "" })} />
                      <span className="text-sm font-medium">Promouvoir existant</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="accountMode" className="w-4 h-4 text-emerald-600" checked={profForm.createAccount} onChange={() => setProfForm({ ...profForm, createAccount: true, userId: undefined })} />
                      <span className="text-sm font-medium">Créer un compte</span>
                    </label>
                  </div>
                  
                  {!profForm.createAccount ? (
                    <div className="space-y-2 mt-3">
                      <label className="text-sm font-medium">Sélectionner un utilisateur</label>
                      <select className="form-select w-full" value={profForm.userId || ""} onChange={(e) => e.target.value ? importUser(e.target.value) : setProfForm({ ...profForm, userId: undefined })}>
                        <option value="">— Aucun —</option>
                        {usersList.map((u) => <option key={u.id} value={u.id}>{u.nom} ({u.email})</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-3">
                      <label className="text-sm font-medium">Mot de passe pour le nouveau compte <span className="text-red-500">*</span></label>
                      <input type="password" className="form-input w-full" value={profForm.motDePasse || ""} onChange={(e) => setProfForm({ ...profForm, motDePasse: e.target.value })} placeholder="Mot de passe" />
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom <span className="text-red-500">*</span></label>
                  <input type="text" className="form-input w-full" value={profForm.nom} onChange={(e) => setProfForm({ ...profForm, nom: e.target.value })} placeholder="M. Diallo" />
                </div>
                <div className="space-y-2 relative">
                  <label className="text-sm font-medium">Spécialités (Départements)</label>
                  <button 
                    type="button" 
                    onClick={() => setSpecialiteOpen(!specialiteOpen)}
                    className="w-full flex items-center justify-between form-input bg-white text-sm"
                  >
                    <span className="truncate">
                      {profForm.specialite.length > 0 ? profForm.specialite.join(', ') : "Sélectionnez..."}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                  </button>
                  
                  {specialiteOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      <div className="p-1 space-y-1">
                        {departementsList.map(d => {
                          const isSelected = profForm.specialite.includes(d.nom);
                          return (
                            <label key={d.id} className={`flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-100 rounded-sm ${isSelected ? 'bg-emerald-50' : ''}`}>
                              <div className="flex items-center gap-2 overflow-hidden">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-gray-300 text-emerald-600 hidden"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setProfForm({ ...profForm, specialite: [...profForm.specialite, d.nom] });
                                    } else {
                                      setProfForm({ ...profForm, specialite: profForm.specialite.filter(s => s !== d.nom) });
                                    }
                                  }}
                                />
                                <span className="truncate">{d.nom}</span>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input type="email" className="form-input w-full" value={profForm.email} onChange={(e) => setProfForm({ ...profForm, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Téléphone</label>
                  <input type="text" className="form-input w-full" value={profForm.telephone} onChange={(e) => setProfForm({ ...profForm, telephone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Salaire mensuel (FCFA) <span className="text-red-500">*</span></label>
                  <input type="number" className="form-input w-full" value={profForm.salaireMensuel} onChange={(e) => setProfForm({ ...profForm, salaireMensuel: e.target.value })} placeholder="150000" />
                </div>
                <div className="space-y-2 flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer mt-6">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300" checked={profForm.actif} onChange={(e) => setProfForm({ ...profForm, actif: e.target.checked })} />
                    <span className="text-sm font-medium">Formateur actif</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <button className="btn btn-outline" onClick={() => setProfForm(null)} disabled={submitting}>Annuler</button>
            <button className="btn btn-primary" onClick={saveProf} disabled={submitting || !profForm?.nom.trim()}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal : suppression ── */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Supprimer le formateur</DialogTitle>
            <DialogDescription className="mt-2 text-red-600">Cette action supprimera le formateur et toutes ses fiches de salaire. Elle est irréversible.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <button className="btn btn-outline" onClick={() => setDeleteId(null)} disabled={submitting}>Annuler</button>
            <button className="btn bg-red-500 text-white hover:bg-red-600 border-none" disabled={submitting} onClick={async () => { 
              if (deleteId && !submitting) { 
                setSubmitting(true); 
                try { 
                  await deleteFormateur(deleteId); 
                  showToast("Le formateur a été supprimé.");
                } catch(e: any){ 
                  console.error(e); 
                  showToast(e.message || "Erreur lors de la suppression.", "error");
                } finally { 
                  setSubmitting(false); 
                  setDeleteId(null); 
                } 
              } 
            }}>
              {submitting ? "Suppression..." : "Supprimer"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border animate-in slide-in-from-bottom-5 duration-300 text-sm font-medium ${
          toastMessage.type === 'success' 
            ? 'bg-[#0a2d26] text-white border-emerald-500/30' 
            : 'bg-red-50 text-red-900 border-red-200'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
