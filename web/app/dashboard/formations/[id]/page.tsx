"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatFCFA } from "@/app/lib/mock-data";
import { formationsApi, usersApi, api } from "@/app/lib/api";
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
  ArrowLeft,
  Users,
  Search,
  UserCheck,
  UserX,
  UserMinus,
  Plus,
  Edit2,
  Trash2,
  GraduationCap,
  Clock,
  DollarSign,
  Loader2,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

// Statuts d'inscription côté backend : en_cours | suspendu | termine | abandonne.
// « actif » et « annule » sont d'anciennes valeurs encore acceptées à l'affichage.
function estActif(statut?: string | null) {
  return !statut || statut === "en_cours" || statut === "actif";
}

function estAbandonne(statut?: string | null) {
  return statut === "abandonne" || statut === "annule";
}

export default function FormationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: formationId } = use(params);
  const router = useRouter();

  const [formation, setFormation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search for Enrolled Students
  const [studentSearch, setStudentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal Add Student
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  // Status Change Confirmation
  const [statusModal, setStatusModal] = useState<{
    userId: string;
    userName: string;
    newStatut: "en_cours" | "suspendu";
  } | null>(null);

  // Delete Inscription Confirmation
  const [deleteModal, setDeleteModal] = useState<{
    userId: string;
    userName: string;
  } | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  // Fetch formation details
  const fetchFormation = async () => {
    try {
      setLoading(true);
      const data = await formationsApi.get(formationId);
      setFormation(data);
    } catch (err: any) {
      console.error("Erreur chargement formation:", err);
      setError("Impossible de charger les détails de la formation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormation();
  }, [formationId]);

  // Load all users for manual enrollment modal
  const handleOpenAddStudent = async () => {
    setShowAddStudentModal(true);
    if (allUsers.length === 0) {
      try {
        const users = await usersApi.list();
        setAllUsers(users || []);
      } catch (err) {
        console.error("Erreur chargement utilisateurs:", err);
      }
    }
  };

  // Process manual enrollment
  const handleManualEnroll = async () => {
    if (!selectedUserId || enrolling) return;
    setEnrolling(true);
    try {
      await usersApi.enroll(selectedUserId, { formationId });
      setShowAddStudentModal(false);
      setSelectedUserId("");
      await fetchFormation();
    } catch (err: any) {
      console.error("Erreur lors de l'inscription:", err);
      alert(err?.response?.data?.message || "Erreur lors de l'inscription de l'élève.");
    } finally {
      setEnrolling(false);
    }
  };

  // Process status change (Actif / Suspendu / Annulé)
  const handleConfirmStatusChange = async () => {
    if (!statusModal || actionLoading) return;
    setActionLoading(true);
    try {
      const { userId, newStatut } = statusModal;
      await usersApi.updateInscriptionStatus(userId, formationId, newStatut);
      setStatusModal(null);
      await fetchFormation();
    } catch (err: any) {
      console.error("Erreur mise à jour statut:", err);
      alert(err?.response?.data?.message || "Erreur lors du changement de statut.");
    } finally {
      setActionLoading(false);
    }
  };

  // Process delete inscription
  const handleConfirmDeleteInscription = async () => {
    if (!deleteModal || actionLoading) return;
    setActionLoading(true);
    try {
      const { userId } = deleteModal;
      await usersApi.removeInscription(userId, formationId);
      setDeleteModal(null);
      await fetchFormation();
    } catch (err: any) {
      console.error("Erreur suppression inscription:", err);
      alert(err?.response?.data?.message || "Erreur lors de la suppression de l'inscription.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0a2d26] dark:text-emerald-400" />
        <p className="text-sm font-medium text-slate-500">Chargement de la formation...</p>
      </div>
    );
  }

  if (error || !formation) {
    return (
      <div className="p-6 bg-white dark:bg-[#111c24] rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-lg mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Formation non trouvée</h2>
        <p className="text-xs text-slate-500">{error || "La formation demandée n'existe pas."}</p>
        <Link href="/dashboard/formations" className="btn btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour aux formations
        </Link>
      </div>
    );
  }

  const inscriptionsList = formation.inscriptions || [];

  // Filtered students
  const filteredInscriptions = inscriptionsList.filter((i: any) => {
    const user = i.user || {};
    const matchSearch =
      (user.nom || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
      (user.telephone || "").includes(studentSearch);

    const matchStatus =
      !statusFilter ||
      (statusFilter === "actif" && estActif(i.statut)) ||
      (statusFilter === "annule" && estAbandonne(i.statut)) ||
      i.statut === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div className="w-full space-y-6">
      {/* Header avec bouton Retour */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/formations"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111c24] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formation.titre}
            </h1>
            <p className="text-xs text-slate-500">
              Département : <strong className="text-slate-700 dark:text-slate-300">{formation.departement?.nom || "Général"}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/dashboard/formations/${formation.id}/contenu`}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60 font-semibold text-xs inline-flex items-center gap-1.5 hover:bg-indigo-100 transition"
          >
            <BookOpen className="w-4 h-4" />
            Contenu du cours
          </Link>

          <Link
            href={`/dashboard/formations/${formation.id}/modifier`}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs inline-flex items-center gap-1.5 hover:bg-slate-200 transition"
          >
            <Edit2 className="w-4 h-4" />
            Modifier
          </Link>

        </div>
      </div>

      {/* Carte Résumé de la Formation */}
      <div className="bg-white dark:bg-[#111c24] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="h-16 sm:h-20 bg-gradient-to-r from-[#0a2d26] to-emerald-700" />
        <div className="px-4 sm:px-6 pb-5 -mt-8 sm:-mt-10">
          <div className="flex items-end gap-4">
            {formation.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={formation.imageUrl}
                alt={formation.titre}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border-2 border-white dark:border-[#111c24] bg-white shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white dark:bg-[#15222e] border-2 border-white dark:border-[#111c24] flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap pb-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  formation.statut === "active"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {formation.statut === "active" ? "Active" : "Inactive"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-200 dark:border-indigo-900/60">
                Niveau : {formation.niveau || "Standard"}
              </span>
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {formation.description || "Aucune description renseignée."}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Formateur : <strong className="text-slate-700 dark:text-slate-300">{formation.formateur?.nom || "Non assigné"}</strong>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <div className="rounded-xl bg-slate-50 dark:bg-[#15222e] border border-slate-200 dark:border-slate-800 p-3.5">
              <span className="text-[11px] text-slate-500 font-medium">Prix d&apos;inscription</span>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatFCFA(formation.prixInscription || 0)}</div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-[#15222e] border border-slate-200 dark:border-slate-800 p-3.5">
              <span className="text-[11px] text-slate-500 font-medium">Mensualité</span>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatFCFA(formation.prixMensualite || 0)} / mois</div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-[#15222e] border border-slate-200 dark:border-slate-800 p-3.5">
              <span className="text-[11px] text-slate-500 font-medium">Durée</span>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{formation.dureeMois || 1} mois</div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleOpenAddStudent}
        className="w-full sm:w-auto sm:min-w-64 mx-auto px-5 py-3 rounded-xl bg-[#0a2d26] dark:bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#124b40] dark:hover:bg-emerald-500 transition shadow-sm cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Inscrire un élève
      </button>

      <Dialog open={showAddStudentModal} onOpenChange={setShowAddStudentModal}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" /> Inscrire un élève à ce cours
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Sélectionnez un utilisateur enregistré pour l&apos;inscrire directement à la formation <strong>{formation.titre}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Sélectionnez l&apos;étudiant <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#15222e] px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none"
              >
                <option value="">-- Choisir un élève --</option>
                {allUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.nom} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowAddStudentModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Annuler
            </button>
            <button
              onClick={handleManualEnroll}
              disabled={!selectedUserId || enrolling}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0a2d26] dark:bg-emerald-600 hover:bg-[#124b40] rounded-xl transition inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Valider l'inscription"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMATION : Changement de Statut (Suspendre / Réactiver) */}
      <Dialog open={!!statusModal} onOpenChange={() => setStatusModal(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[420px] rounded-2xl p-6 text-center">
          <DialogHeader className="items-center">
            <ShieldAlert className="w-12 h-12 text-amber-500 mb-2 mx-auto" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {statusModal?.newStatut === "suspendu" ? "Suspendre l'accès ?" : "Réactiver l'accès ?"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Êtes-vous sûr de vouloir passer le statut d&apos;accès de <strong>{statusModal?.userName}</strong> à{" "}
              <strong className="text-slate-800 dark:text-slate-200 uppercase">{statusModal?.newStatut === "suspendu" ? "Suspendu" : "Actif"}</strong> pour la formation{" "}
              <strong>{formation.titre}</strong> ?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => setStatusModal(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirmStatusChange}
              disabled={actionLoading}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition inline-flex items-center gap-1.5 ${
                statusModal?.newStatut === "suspendu"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer le statut"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMATION : Désinscription */}
      <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[420px] rounded-2xl p-6 text-center">
          <DialogHeader className="items-center">
            <UserMinus className="w-12 h-12 text-rose-500 mb-2 mx-auto" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Désinscrire l&apos;élève ?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Êtes-vous sûr de vouloir supprimer l&apos;inscription de <strong>{deleteModal?.userName}</strong> de ce cours ? L&apos;élève n&apos;aura plus accès à cette formation.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => setDeleteModal(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirmDeleteInscription}
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition inline-flex items-center gap-1.5"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Oui, désinscrire"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
