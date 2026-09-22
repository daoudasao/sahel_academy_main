"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useFormateurs } from "@/app/context/FormateursContext";
import {
  salaireTotalVerse,
  salaireStatut,
  salaireStatutLabel,
  formatFCFA,
  formatDate,
} from "@/app/lib/mock-data";
import { formationsApi, departementsApi, formateursApi } from "@/app/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  ArrowLeft,
  Mail,
  Phone,
  Wallet,
  Calendar,
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Award,
  UserCheck,
  CreditCard,
  Building2,
  ChevronRight,
  TrendingUp,
  FileText,
  Percent,
} from "lucide-react";

const NOMS_MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];
const ANNEES = [2025, 2026, 2027];
const MOIS_OPTIONS = ANNEES.flatMap((a) => NOMS_MOIS.map((m) => `${m} ${a}`));
const initiale = (nom: string) => nom.replace(/^(M\.|Mme|Mr\.)\s*/, "").charAt(0).toUpperCase();
const today = () => new Date().toISOString().split("T")[0];

function moisRank(mois: string): number {
  const [nom, annee] = mois.split(" ");
  const i = NOMS_MOIS.indexOf(nom);
  return Number(annee || 0) * 12 + (i < 0 ? 0 : i);
}

const badgeClasses: Record<string, string> = {
  paye: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  partiel: "bg-amber-50 text-amber-700 border-amber-200/60",
  enAttente: "bg-slate-100 text-slate-600 border-slate-200",
};

type ProfEditForm = {
  nom: string;
  email: string;
  telephone: string;
  specialite: string;
  salaireMensuel: string;
  actif: boolean;
};

type FicheForm = { id?: string; mois: string; montantDu: string };
type VersForm = { montant: string; date: string; note: string };

export default function FormateurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    formateurs,
    salaires,
    updateFormateur,
    addFiche,
    updateFiche,
    deleteFiche,
    addVersement,
    removeVersement
  } = useFormateurs();

  const formateur = formateurs.find((f) => f.id === id);

  // States
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profEdit, setProfEdit] = useState<ProfEditForm | null>(null);

  const [ficheForm, setFicheForm] = useState<FicheForm | null>(null);
  const [deleteFicheId, setDeleteFicheId] = useState<string | null>(null);
  const [versementFicheId, setVersementFicheId] = useState<string | null>(null);
  const [versForm, setVersForm] = useState<VersForm>({ montant: "", date: today(), note: "" });
  const [formationsList, setFormationsList] = useState<any[]>([]);
  const [departementsList, setDepartementsList] = useState<any[]>([]);
  const [serverGains, setServerGains] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      formationsApi.list(),
      departementsApi.list(),
      formateursApi.getGains(id),
    ]).then(([forms, depts, gainsData]) => {
      setFormationsList(forms || []);
      setDepartementsList(depts || []);
      setServerGains(gainsData || null);
    }).catch(() => {});
  }, [id]);

  if (!formateur) return notFound();

  const cours = formationsList.filter((f) => (f.formateurId ?? f.formateur?.id) === id);

  // Use server-calculated gains directly from NestJS PostgreSQL DB
  const breakdownGains = serverGains?.formationsGains || cours.map((c) => {
    const pct = c.pourcentageFormateur ?? 30;
    return {
      id: c.id,
      titre: c.titre,
      pourcentageFormateur: pct,
      pourcentage: pct,
      encaissements: 0,
      gainFormateur: 0,
      partCentre: 0,
    };
  });

  const totalEncaissementsFormateur = serverGains?.totalEncaissementsGlobal ?? breakdownGains.reduce((s: number, g: any) => s + g.encaissements, 0);
  const totalGainFormateurCumule = serverGains?.gainFormateurTotal ?? breakdownGains.reduce((s: number, g: any) => s + g.gainFormateur, 0);
  const totalPartCentreCumule = serverGains?.partCentreTotal ?? breakdownGains.reduce((s: number, g: any) => s + g.partCentre, 0);

  const fiches = salaires.filter((s) => s.formateurId === id).sort((a, b) => moisRank(b.mois) - moisRank(a.mois));

  const totalDu = fiches.reduce((sum, s) => sum + s.montantDu, 0);
  const totalVerse = fiches.reduce((sum, s) => sum + salaireTotalVerse(s), 0);
  const reste = Math.max(0, totalDu - totalVerse);
  const totalPct = totalDu > 0 ? Math.min(100, Math.round((totalVerse / totalDu) * 100)) : 0;

  const ficheEnCours = salaires.find((s) => s.id === versementFicheId) || null;

  // Handlers
  const handleOpenEditProfile = () => {
    setProfEdit({
      nom: formateur.nom,
      email: formateur.email || "",
      telephone: formateur.telephone || "",
      specialite: formateur.specialite || "",
      salaireMensuel: String(formateur.salaireMensuel),
      actif: formateur.actif,
    });
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = () => {
    if (!profEdit || !profEdit.nom.trim()) return;
    updateFormateur(formateur.id, {
      nom: profEdit.nom.trim(),
      email: profEdit.email.trim() || undefined,
      telephone: profEdit.telephone.trim() || undefined,
      specialite: profEdit.specialite.trim() || undefined,
      salaireMensuel: Math.max(0, Number(profEdit.salaireMensuel) || 0),
      actif: profEdit.actif,
    });
    setShowEditProfileModal(false);
  };

  const saveFiche = () => {
    if (!ficheForm || !ficheForm.mois) return;
    const du = Math.max(0, Number(ficheForm.montantDu) || 0);
    if (ficheForm.id) updateFiche(ficheForm.id, { mois: ficheForm.mois, montantDu: du });
    else addFiche({ formateurId: id, mois: ficheForm.mois, montantDu: du });
    setFicheForm(null);
  };

  const submitVersement = () => {
    if (!versementFicheId || !ficheEnCours) return;
    const verse = salaireTotalVerse(ficheEnCours);
    const resteFiche = Math.max(0, ficheEnCours.montantDu - verse);
    const montant = Math.max(0, Number(versForm.montant) || 0);
    if (montant <= 0 || montant > resteFiche) return;
    addVersement(versementFicheId, { montant, date: versForm.date || today(), note: versForm.note.trim() || undefined });
    setVersForm({ montant: "", date: today(), note: "" });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation & Header */}
      <div>
        <Link
          href="/dashboard/formateurs"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Retour à la liste des formateurs
        </Link>

        {/* Hero Card Profile Header */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0a2d26] to-[#124d42] text-white flex items-center justify-center text-2xl font-bold shadow-md shadow-[#0a2d26]/10 shrink-0">
                {initiale(formateur.nom)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{formateur.nom}</h1>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      formateur.actif
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${formateur.actif ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {formateur.actif ? "Formateur Actif" : "Inactif"}
                  </span>
                  {formateur.userId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      <UserCheck className="w-3 h-3" />
                      Compte Utilisateur
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-700">{formateur.specialite || "Formateur spécialisé"}</span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <Wallet className="w-3.5 h-3.5" />
                    {formatFCFA(formateur.salaireMensuel)} / mois
                  </span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleOpenEditProfile}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Modifier le profil
              </button>
              <button
                onClick={() => setFicheForm({ mois: MOIS_OPTIONS.find((m) => m.includes("2026")) || "", montantDu: String(formateur.salaireMensuel) })}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0a2d26] hover:bg-[#08221c] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nouvelle fiche de salaire
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{cours.length}</div>
            <div className="text-xs font-medium text-slate-500">Cours assignés</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">{formatFCFA(totalEncaissementsFormateur)}</div>
            <div className="text-xs font-medium text-slate-500">Total Encaissements Élèves</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-700">{formatFCFA(totalGainFormateurCumule)}</div>
            <div className="text-xs font-medium text-slate-500">Gain Formateur Cumulé (Temps réel)</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-lg font-bold text-amber-700">{formatFCFA(totalPartCentreCumule)}</div>
            <div className="text-xs font-medium text-slate-500">Part du Centre (70%)</div>
          </div>
        </div>
      </div>

      {/* Section Gains par Pourcentage */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Percent className="w-5 h-5 text-emerald-600" />
              Rémunération & Gains par Formation (Calculés en Temps Réel)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Partage de revenus négocié (%) calculé automatiquement sur les règlements des élèves (inscription + mensualités).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b">
                <th className="py-2.5 px-3 text-left font-semibold">Formation</th>
                <th className="py-2.5 px-3 text-left font-semibold">Partage % (Prof / Centre)</th>
                <th className="py-2.5 px-3 text-left font-semibold">Encaissements Élèves</th>
                <th className="py-2.5 px-3 text-left font-semibold">Gain Formateur</th>
                <th className="py-2.5 px-3 text-left font-semibold">Part du Centre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {breakdownGains.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400">
                    Aucun cours n&apos;est assigné à ce formateur.
                  </td>
                </tr>
              ) : (
                breakdownGains.map((item: any) => {
                  const pctProf = item.pourcentageFormateur ?? item.pourcentage ?? 30;
                  const pctCentre = 100 - pctProf;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{item.titre}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {pctProf}% Prof / {pctCentre}% Centre
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{formatFCFA(item.encaissements)}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600">{formatFCFA(item.gainFormateur)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-500">{formatFCFA(item.partCentre)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Coordinates & Assigned Courses */}
        <div className="space-y-6 lg:col-span-1">
          {/* Coordinates Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Award className="w-4 h-4 text-emerald-600" />
              Coordonnées & Informations
            </h2>

            <div className="space-y-3.5 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Adresse Email</div>
                  <div className="font-semibold text-slate-800 break-all">{formateur.email || "Non renseigné"}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Téléphone</div>
                  <div className="font-semibold text-slate-800">{formateur.telephone || "Non renseigné"}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Salaire mensuel de base</div>
                  <div className="font-semibold text-slate-800">{formatFCFA(formateur.salaireMensuel)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Date d'enregistrement</div>
                  <div className="font-semibold text-slate-800">{formatDate(formateur.dateAjout)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Cours Assignés Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Cours assignés ({cours.length})
              </h2>
              <Link
                href="/dashboard/formations"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1"
              >
                Gérer
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {cours.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500">Aucun cours n'est assigné à ce formateur.</p>
                <Link
                  href="/dashboard/formations"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0a2d26] hover:underline pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Assigner un cours
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {cours.map((c) => {
                  const dept = departementsList.find((d) => d.id === c.departementId);
                  return (
                    <Link
                      key={c.id}
                      href="/dashboard/formations"
                      className="block bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl p-3.5 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                          {c.titre}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>

                      <div className="flex items-center gap-2 mt-2.5 flex-wrap text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium border border-purple-200/50">
                          <Building2 className="w-3 h-3" />
                          {dept?.nom || c.departementId}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 font-medium">
                          <Users className="w-3 h-3" />
                          {c.inscrits} inscrits
                        </span>
                        {c.estBourse && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-200/50">
                            Bourse
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Salaires & Versements History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Gestion des Fiches de Salaire
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Historique mensuel, statut des paiements et versements effectués</p>
              </div>

              <button
                onClick={() => setFicheForm({ mois: MOIS_OPTIONS.find((m) => m.includes("2026")) || "", montantDu: String(formateur.salaireMensuel) })}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0a2d26] hover:bg-[#08221c] text-white text-xs font-semibold shadow-sm transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nouvelle fiche
              </button>
            </div>

            {/* Global Progress Bar */}
            {fiches.length > 0 && (
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Progression globale des règlements
                  </span>
                  <span className="font-bold text-emerald-700">{totalPct}% réglé</span>
                </div>

                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                    style={{ width: `${totalPct}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-slate-500 pt-1">
                  <span>Versé: <strong className="text-emerald-700 font-semibold">{formatFCFA(totalVerse)}</strong></span>
                  <span>Total Dû: <strong className="text-slate-800 font-semibold">{formatFCFA(totalDu)}</strong></span>
                  <span>Reste: <strong className={reste > 0 ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>{formatFCFA(reste)}</strong></span>
                </div>
              </div>
            )}

            {/* Salary Sheets List */}
            {fiches.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
                <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-sm font-medium text-slate-600">Aucune fiche de salaire enregistrée</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Créez une première fiche mensuelle pour ce formateur pour commencer à suivre ses versements.
                </p>
                <button
                  onClick={() => setFicheForm({ mois: MOIS_OPTIONS.find((m) => m.includes("2026")) || "", montantDu: String(formateur.salaireMensuel) })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0a2d26] text-white text-xs font-semibold shadow-sm hover:bg-[#08221c] transition-colors mt-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Créer une fiche de salaire
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {fiches.map((s) => {
                  const verse = salaireTotalVerse(s);
                  const resteFiche = Math.max(0, s.montantDu - verse);
                  const statut = salaireStatut(s);
                  const pct = s.montantDu > 0 ? Math.min(100, Math.round((verse / s.montantDu) * 100)) : 0;
                  const versements = [...s.versements].sort((a, b) => (a.date < b.date ? 1 : -1));

                  return (
                    <div
                      key={s.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
                    >
                      {/* Sheet Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                            {s.mois.substring(0, 3)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-base">{s.mois}</div>
                            <div className="text-xs text-slate-500">
                              Montant dû : <strong className="text-slate-800">{formatFCFA(s.montantDu)}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClasses[statut]}`}>
                            {salaireStatutLabel[statut]}
                          </span>

                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => {
                                setVersementFicheId(s.id);
                                setVersForm({ montant: String(resteFiche || ""), date: today(), note: "" });
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Ajouter un versement"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Versement
                            </button>
                            <button
                              onClick={() => setFicheForm({ id: s.id, mois: s.mois, montantDu: String(s.montantDu) })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Modifier la fiche"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteFicheId(s.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Supprimer la fiche"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar & Amounts */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-600">
                            Versé : <strong className="text-emerald-700">{formatFCFA(verse)}</strong> / {formatFCFA(s.montantDu)}
                          </span>
                          <span className={resteFiche > 0 ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                            {resteFiche > 0 ? `Reste à payer : ${formatFCFA(resteFiche)}` : "Paiement Soldé"}
                          </span>
                        </div>

                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              resteFiche === 0 ? "bg-emerald-500" : verse > 0 ? "bg-amber-500" : "bg-slate-300"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Versements List */}
                      {versements.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Historique des paiements ({versements.length})
                          </div>
                          <div className="divide-y divide-slate-100 bg-slate-50/70 rounded-xl p-2 border border-slate-200/60">
                            {versements.map((v) => (
                              <div key={v.id} className="flex items-center justify-between p-2 text-xs">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-900">{formatFCFA(v.montant)}</div>
                                  <div className="text-slate-500">
                                    Le {formatDate(v.date)} {v.note ? `• ${v.note}` : ""}
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeVersement(s.id, v.id)}
                                  className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Supprimer ce versement"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal : Modifier Profil Formateur ── */}
      <Dialog open={showEditProfileModal} onOpenChange={setShowEditProfileModal}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Modifier le profil du formateur</DialogTitle>
            <DialogDescription>Mettez à jour les informations personnelles et le salaire de base.</DialogDescription>
          </DialogHeader>

          {profEdit && (
            <div className="grid gap-4 py-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-medium text-slate-700">Nom & Prénom <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="form-input w-full"
                    value={profEdit.nom}
                    onChange={(e) => setProfEdit({ ...profEdit, nom: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-medium text-slate-700">Spécialité</label>
                  <input
                    type="text"
                    className="form-input w-full"
                    value={profEdit.specialite}
                    onChange={(e) => setProfEdit({ ...profEdit, specialite: e.target.value })}
                    placeholder="Développement Web"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    className="form-input w-full"
                    value={profEdit.email}
                    onChange={(e) => setProfEdit({ ...profEdit, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-medium text-slate-700">Téléphone</label>
                  <input
                    type="text"
                    className="form-input w-full"
                    value={profEdit.telephone}
                    onChange={(e) => setProfEdit({ ...profEdit, telephone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <label className="font-medium text-slate-700">Salaire mensuel de base (FCFA) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    className="form-input w-full"
                    value={profEdit.salaireMensuel}
                    onChange={(e) => setProfEdit({ ...profEdit, salaireMensuel: e.target.value })}
                  />
                </div>

                <div className="pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      checked={profEdit.actif}
                      onChange={(e) => setProfEdit({ ...profEdit, actif: e.target.checked })}
                    />
                    <span className="font-medium text-slate-700">Formateur actif</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <button className="btn btn-outline" onClick={() => setShowEditProfileModal(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSaveProfile}>Enregistrer les modifications</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal : Fiche de Salaire ── */}
      <Dialog open={!!ficheForm} onOpenChange={(o) => !o && setFicheForm(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{ficheForm?.id ? "Modifier la fiche" : "Nouvelle fiche de salaire"}</DialogTitle>
            <DialogDescription>{formateur.nom} — choisissez le mois et le montant dû.</DialogDescription>
          </DialogHeader>

          {ficheForm && (
            <div className="grid grid-cols-2 gap-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Mois concerné <span className="text-red-500">*</span></label>
                <select
                  className="form-select w-full text-sm"
                  value={ficheForm.mois}
                  onChange={(e) => setFicheForm({ ...ficheForm, mois: e.target.value })}
                >
                  {MOIS_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Montant dû (FCFA) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  className="form-input w-full text-sm"
                  value={ficheForm.montantDu}
                  onChange={(e) => setFicheForm({ ...ficheForm, montantDu: e.target.value })}
                  placeholder="150000"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <button className="btn btn-outline" onClick={() => setFicheForm(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={saveFiche}>{ficheForm?.id ? "Enregistrer" : "Créer la fiche"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal : Versements ── */}
      <Dialog open={!!versementFicheId} onOpenChange={(o) => { if (!o) { setVersementFicheId(null); setVersForm({ montant: "", date: today(), note: "" }); } }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Enregistrer un versement</DialogTitle>
            <DialogDescription>{formateur.nom} — {ficheEnCours?.mois}</DialogDescription>
          </DialogHeader>

          {ficheEnCours && (() => {
            const verse = salaireTotalVerse(ficheEnCours);
            const resteFiche = Math.max(0, ficheEnCours.montantDu - verse);
            const pct = ficheEnCours.montantDu > 0 ? Math.min(100, Math.round((verse / ficheEnCours.montantDu) * 100)) : 0;

            return (
              <div className="py-2 space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">
                      Versé : <strong className="text-emerald-700">{formatFCFA(verse)}</strong> / {formatFCFA(ficheEnCours.montantDu)}
                    </span>
                    <span className={resteFiche > 0 ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                      {resteFiche > 0 ? `Reste: ${formatFCFA(resteFiche)}` : "Soldé"}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Historical versements */}
                {ficheEnCours.versements.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500 uppercase">Versements enregistrés</div>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                      {[...ficheEnCours.versements].sort((a, b) => (a.date < b.date ? 1 : -1)).map((v) => (
                        <div key={v.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs">
                          <div>
                            <div className="font-bold text-slate-900">{formatFCFA(v.montant)}</div>
                            <div className="text-slate-500">{formatDate(v.date)} {v.note ? `• ${v.note}` : ""}</div>
                          </div>
                          <button
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            onClick={() => removeVersement(ficheEnCours.id, v.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Versement Form */}
                {(() => {
                  const montantNum = Number(versForm.montant) || 0;
                  const isExceeded = montantNum > resteFiche;
                  const isInvalid = montantNum <= 0 || isExceeded;

                  return (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
                      <div className="text-xs font-semibold text-slate-800">Nouveau règlement</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 mb-1 block">Montant (FCFA)</label>
                          <input
                            type="number"
                            max={resteFiche}
                            className={`form-input w-full text-xs ${isExceeded ? "border-red-500 focus:ring-red-500" : ""}`}
                            value={versForm.montant}
                            onChange={(e) => setVersForm({ ...versForm, montant: e.target.value })}
                            placeholder={`Max: ${formatFCFA(resteFiche)}`}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 mb-1 block">Date du versement</label>
                          <input
                            type="date"
                            className="form-input w-full text-xs"
                            value={versForm.date}
                            onChange={(e) => setVersForm({ ...versForm, date: e.target.value })}
                          />
                        </div>
                      </div>

                      {isExceeded && (
                        <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          Le montant ne peut pas dépasser le reste à payer ({formatFCFA(resteFiche)}).
                        </p>
                      )}

                      <div>
                        <label className="text-[11px] font-medium text-slate-500 mb-1 block">Note / Mode de paiement</label>
                        <input
                          type="text"
                          className="form-input w-full text-xs"
                          value={versForm.note}
                          onChange={(e) => setVersForm({ ...versForm, note: e.target.value })}
                          placeholder="ex. Virement bancaire, Espèces, Mobile Money..."
                        />
                      </div>
                      <button
                        className="btn btn-primary w-full text-xs py-2 mt-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={submitVersement}
                        disabled={isInvalid}
                      >
                        Valider le versement
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          <DialogFooter>
            <button className="btn btn-outline" onClick={() => { setVersementFicheId(null); setVersForm({ montant: "", date: today(), note: "" }); }}>Fermer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal : Suppression Fiche ── */}
      <Dialog open={!!deleteFicheId} onOpenChange={(o) => !o && setDeleteFicheId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Supprimer la fiche de salaire</DialogTitle>
            <DialogDescription className="mt-2 text-red-600 text-xs">
              Cette action supprimera définitivement cette fiche mensuelle ainsi que l'ensemble des versements associés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <button className="btn btn-outline" onClick={() => setDeleteFicheId(null)}>Annuler</button>
            <button
              className="btn bg-red-600 hover:bg-red-700 text-white border-none cursor-pointer"
              onClick={() => { if (deleteFicheId) deleteFiche(deleteFicheId); setDeleteFicheId(null); }}
            >
              Supprimer définitivement
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
