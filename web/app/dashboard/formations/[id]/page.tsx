"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import InfoBanner from "@/app/components/InfoBanner";
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
  const totalInscrits = inscriptionsList.length;
  const inscritsActifs = inscriptionsList.filter((i: any) => estActif(i.statut)).length;
  const inscritsSuspendus = inscriptionsList.filter((i: any) => i.statut === "suspendu").length;
  const inscritsAnnules = inscriptionsList.filter((i: any) => estAbandonne(i.statut)).length;

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

          <button
            onClick={handleOpenAddStudent}
            className="px-3.5 py-2 rounded-xl bg-[#0a2d26] dark:bg-emerald-600 text-white font-semibold text-xs inline-flex items-center gap-1.5 hover:bg-[#124b40] dark:hover:bg-emerald-500 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Inscrire un élève
          </button>
        </div>
      </div>

      <InfoBanner title="Gestion des Élèves & Accès au cours">
        Consultez l&apos;ensemble des étudiants inscrits à cette formation. Vous pouvez <strong>suspendre l&apos;accès</strong> d&apos;un élève (ex: retard de paiement), <strong>réactiver son accès</strong> ou l&apos;inscrire directement à ce cours.
      </InfoBanner>

      {/* Carte Résumé de la Formation */}
      <div className="bg-white dark:bg-[#111c24] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-start gap-4">
              {formation.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={formation.imageUrl}
                  alt={formation.titre}
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-[#0a2d26]/10 dark:bg-emerald-500/20 flex items-center justify-center text-[#0a2d26] dark:text-emerald-400 font-bold text-2xl shrink-0">
                  <GraduationCap className="w-10 h-10" />
                </div>
              )}
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      formation.statut === "active"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {formation.statut === "active" ? "Formation Active" : "Inactive"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-200 dark:border-indigo-900/60">
                    Niveau : {formation.niveau || "Standard"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                  {formation.description || "Aucune description renseignée."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400">Formateur référent :</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                  {formation.formateur?.nom || "Non assigné"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Durée du programme :</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{formation.dureeMois || 1} mois</p>
              </div>
              <div>
                <span className="text-slate-400">Tarif Mensualité :</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatFCFA(formation.prixMensualite || 0)} / mois</p>
              </div>
            </div>
          </div>

          {/* Statistiques Inscriptions */}
          <div className="bg-slate-50 dark:bg-[#15222e] rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 flex flex-col justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Statistiques d&apos;inscriptions
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-[#111c24] p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 font-medium">Total Élèves</span>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalInscrits}</div>
              </div>
              <div className="bg-white dark:bg-[#111c24] p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 font-medium">Actifs</span>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{inscritsActifs}</div>
              </div>
              <div className="bg-white dark:bg-[#111c24] p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 font-medium">Suspendus</span>
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{inscritsSuspendus}</div>
              </div>
              <div className="bg-white dark:bg-[#111c24] p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 font-medium">Abandons</span>
                <div className="text-xl font-bold text-rose-500 dark:text-rose-400">{inscritsAnnules}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres des Élèves */}
      <div className="bg-white dark:bg-[#111c24] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Liste des étudiants inscrits ({filteredInscriptions.length})
            </h3>
            <p className="text-xs text-slate-500">Gérez les accès et le statut de chaque élève pour ce cours.</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher élève, email, tel..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#15222e] border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-[#15222e] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="actif">Actif (Inscrit)</option>
              <option value="suspendu">Suspendu</option>
              <option value="termine">Terminé</option>
              <option value="annule">Abandonné / Annulé</option>
            </select>
          </div>
        </div>

        {/* Tableau des Inscriptions */}
        <div className="overflow-x-auto">
          {filteredInscriptions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Aucun étudiant trouvé.</p>
              <p className="text-xs text-slate-400">Aucun élève n&apos;est inscrit à ce cours selon ces critères.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#15222e] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4 font-semibold">Étudiant</th>
                  <th className="py-3 px-4 font-semibold">Contact</th>
                  <th className="py-3 px-4 font-semibold">Date d&apos;inscription</th>
                  <th className="py-3 px-4 font-semibold">Statut d&apos;accès</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInscriptions.map((ins: any) => {
                  const u = ins.user || {};
                  const isActif = estActif(ins.statut);
                  const isSuspendu = ins.statut === "suspendu";
                  const isTermine = ins.statut === "termine";

                  return (
                    <tr key={ins.id || u.id} className="hover:bg-slate-50/80 dark:hover:bg-[#15222e]/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl || u.image || u.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.avatarUrl || u.image || u.avatar} alt={u.nom} className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#0a2d26]/10 dark:bg-emerald-500/20 text-[#0a2d26] dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">
                              {u.nom ? u.nom.substring(0, 2).toUpperCase() : "ET"}
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/dashboard/utilisateurs/${u.id}`}
                              className="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                            >
                              {u.nom || "Élève Sans Nom"}
                            </Link>
                            <div className="text-[11px] text-slate-400">ID: {u.id?.substring(0, 10)}...</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{u.email || "Non renseigné"}</span>
                        </div>
                        {u.telephone && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{u.telephone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {ins.createdAt || ins.dateInscription
                          ? new Date(ins.createdAt || ins.dateInscription).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Non spécifiée"}
                      </td>

                      <td className="py-3 px-4">
                        {isActif ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-900/60 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Accès Actif
                          </span>
                        ) : isTermine ? (
                          <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 font-bold text-[10px] border border-sky-200 dark:border-sky-900/60 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Terminé
                          </span>
                        ) : isSuspendu ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-[10px] border border-amber-200 dark:border-amber-900/60 inline-flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Suspendu
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[10px] border border-rose-200 dark:border-rose-900/60 inline-flex items-center gap-1">
                            <UserX className="w-3 h-3" /> Abandonné
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Bouton Suspendre / Réactiver */}
                          {isActif ? (
                            <button
                              onClick={() =>
                                setStatusModal({
                                  userId: u.id,
                                  userName: u.nom,
                                  newStatut: "suspendu",
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 font-semibold text-xs transition inline-flex items-center gap-1"
                              title="Suspendre l'accès de cet élève"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              Suspendre
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setStatusModal({
                                  userId: u.id,
                                  userName: u.nom,
                                  newStatut: "en_cours",
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 font-semibold text-xs transition inline-flex items-center gap-1"
                              title="Réactiver l'accès au cours"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Réactiver
                            </button>
                          )}

                          {/* Lien Profil Élève */}
                          <Link
                            href={`/dashboard/utilisateurs/${u.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Consulter la fiche profil de l'élève"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          {/* Bouton Désinscrire */}
                          <button
                            onClick={() =>
                              setDeleteModal({
                                userId: u.id,
                                userName: u.nom,
                              })
                            }
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Supprimer l'inscription de l'élève"
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
          )}
        </div>
      </div>

      {/* MODAL : Inscrire un élève manuellement */}
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
