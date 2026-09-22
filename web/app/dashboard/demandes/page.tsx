"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { demandesApi } from "@/app/lib/api";
import { exporterEnCsv } from "@/app/lib/export-csv";
import InfoBanner from "@/app/components/InfoBanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Search,
  BookOpen,
  User,
  Phone,
  Mail,
  Sparkles,
  RefreshCw,
  Download,
  Loader2,
} from "lucide-react";

export default function DemandesPage() {
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState<string>("tous");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Modal confirmation (Validation / Refus)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: "valider" | "refuser";
    demandeId: string;
    userName: string;
    formationTitre: string;
  }>({
    open: false,
    type: "valider",
    demandeId: "",
    userName: "",
    formationTitre: "",
  });

  const chargerDemandes = async () => {
    setLoading(true);
    try {
      const data = await demandesApi.list();
      setDemandes(data ?? []);
    } catch (err) {
      console.error("Erreur chargement demandes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDemandes();
  }, []);

  const validerDemande = async (id: string) => {
    setProcessingId(id);
    try {
      const res: any = await demandesApi.valider(id);
      await chargerDemandes();
      setConfirmModal((prev) => ({ ...prev, open: false }));
      if (res?.message) {
        setToastMessage({
          text: res.message,
          type: res.dejaInscrit ? "info" : "success",
        });
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la validation de la demande");
    } finally {
      setProcessingId(null);
    }
  };

  const refuserDemande = async (id: string) => {
    setProcessingId(id);
    try {
      await demandesApi.refuser(id);
      await chargerDemandes();
      setConfirmModal((prev) => ({ ...prev, open: false }));
    } catch (err) {
      console.error(err);
      alert("Erreur lors du refus de la demande");
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === "valider") {
      validerDemande(confirmModal.demandeId);
    } else {
      refuserDemande(confirmModal.demandeId);
    }
  };

  const total = demandes.length;
  const nbEnAttente = demandes.filter((d) => d.statut === "en_attente").length;
  const nbValides = demandes.filter((d) => d.statut === "valide").length;
  const nbRefuses = demandes.filter((d) => d.statut === "refuse").length;

  const demandesFiltrees = demandes.filter((d) => {
    if (filtreStatut === "en_attente" && d.statut !== "en_attente") return false;
    if (filtreStatut === "valide" && d.statut !== "valide") return false;
    if (filtreStatut === "refuse" && d.statut !== "refuse") return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const nom = (d.user?.nom ?? "").toLowerCase();
      const email = (d.user?.email ?? "").toLowerCase();
      const tel = (d.user?.telephone ?? "").toLowerCase();
      const formation = (d.formation?.titre ?? "").toLowerCase();
      return (
        nom.includes(q) || email.includes(q) || tel.includes(q) || formation.includes(q)
      );
    }
    return true;
  });

  const exporterCsv = () => {
    const enTetes = ["Élève", "Email", "Téléphone", "Formation", "Prix Inscription", "Statut", "Date Demande"];
    const lignes = demandesFiltrees.map((d) => [
      d.user?.nom || "Élève sans nom",
      d.user?.email || "",
      d.user?.telephone || "",
      d.formation?.titre || "",
      d.formation?.prixInscription || 0,
      d.statut === "en_attente" ? "En attente" : d.statut === "valide" ? "Validé" : "Refusé",
      new Date(d.createdAt).toLocaleDateString("fr-FR"),
    ]);
    exporterEnCsv("demandes_inscription", enTetes, lignes);
  };

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#0a2d26]/10 text-[#0a2d26] rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">
                Demandes d&apos;inscription
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Validez les demandes d&apos;inscription aux formations et échangez avec les élèves via le support.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exporterCsv}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Exporter CSV
          </button>
          <button
            onClick={chargerDemandes}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border ${
            toastMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-blue-50 text-blue-800 border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <InfoBanner
        variant="info"
        title="Workflow d'inscription hybride"
      >
        Lorsqu'un élève clique sur « Rejoindre la formation », une demande est enregistrée ici et un premier message est envoyé dans le chat Support. Après échange, cliquez sur « Inscrire au cours » pour lui valider l'accès aux classes.
      </InfoBanner>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111c24] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{total}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Demandes</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111c24] p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/60 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400">{nbEnAttente}</div>
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400/80">En attente d&apos;échange</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111c24] p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{nbValides}</div>
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400/80">Inscrits / Validés</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111c24] p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/60 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-lg">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-400">{nbRefuses}</div>
            <div className="text-xs font-medium text-rose-600 dark:text-rose-400/80">Refusés</div>
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#111c24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "tous", label: `Toutes (${total})` },
            { id: "en_attente", label: `En attente (${nbEnAttente})` },
            { id: "valide", label: `Validées (${nbValides})` },
            { id: "refuse", label: `Refusées (${nbRefuses})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltreStatut(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filtreStatut === f.id
                  ? "bg-[#0a2d26] dark:bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher élève ou formation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#15222e] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-[#0a2d26] dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-[#111c24] transition"
          />
        </div>
      </div>

      {/* Tableau des Demandes */}
      <div className="bg-white dark:bg-[#111c24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium">
            Chargement des demandes d&apos;inscription...
          </div>
        ) : demandesFiltrees.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-bold text-slate-700 dark:text-slate-200">Aucune demande trouvée</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Les demandes d&apos;inscription soumises par les candidats apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-[#15222e] border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Élève Candidat</th>
                  <th className="py-3.5 px-4">Formation Demandée</th>
                  <th className="py-3.5 px-4">Date Demande</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                {demandesFiltrees.map((d) => {
                  const isPending = d.statut === "en_attente";
                  const isValidated = d.statut === "valide";
                  const userAvatar = d.user?.avatarUrl || d.user?.image || d.user?.avatar;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      {/* Élève */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {userAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={userAvatar}
                              alt={d.user?.nom || "Avatar"}
                              className="w-9 h-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#0a2d26]/10 dark:bg-emerald-500/20 text-[#0a2d26] dark:text-emerald-400 font-extrabold flex items-center justify-center text-xs shrink-0">
                              {d.user?.nom ? d.user.nom.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">{d.user?.nom || "Élève sans nom"}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              {d.user?.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-400" /> {d.user.email}
                                </span>
                              )}
                              {d.user?.telephone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" /> {d.user.telephone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Formation */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {d.formation?.titre || "Formation inconnue"}
                        </div>
                        {d.formation?.prixInscription > 0 && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Prix: {d.formation.prixInscription.toLocaleString()} FCFA
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        {new Date(d.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Statut */}
                      <td className="py-3.5 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" /> En attente
                          </span>
                        )}
                        {isValidated && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" /> Inscrit(e) / Validé(e)
                          </span>
                        )}
                        {!isPending && !isValidated && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60 shadow-2xs">
                            <XCircle className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400 shrink-0" /> Refusé(e)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Chat Support Link */}
                          <Link
                            href={`/dashboard/support?user=${d.userId}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#15222e] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                            title="Échanger sur le Chat Support"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Chat Support</span>
                          </Link>

                          {/* Action Valider */}
                          {isPending && (
                            <button
                              onClick={() =>
                                setConfirmModal({
                                  open: true,
                                  type: "valider",
                                  demandeId: d.id,
                                  userName: d.user?.nom || "l'élève",
                                  formationTitre: d.formation?.titre || "la formation",
                                })
                              }
                              disabled={processingId === d.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a2d26] hover:bg-[#0a2d26]/90 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span>Inscrire au cours</span>
                            </button>
                          )}

                          {/* Action Refuser */}
                          {isPending && (
                            <button
                              onClick={() =>
                                setConfirmModal({
                                  open: true,
                                  type: "refuser",
                                  demandeId: d.id,
                                  userName: d.user?.nom || "l'élève",
                                  formationTitre: d.formation?.titre || "la formation",
                                })
                              }
                              disabled={processingId === d.id}
                              className="inline-flex items-center p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Refuser la demande"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Confirmation (Valider ou Refuser) */}
      <Dialog
        open={confirmModal.open}
        onOpenChange={(open) => {
          if (!open && !processingId) {
            setConfirmModal((prev) => ({ ...prev, open: false }));
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle
              className={`flex items-center gap-2 text-lg font-bold ${
                confirmModal.type === "valider" ? "text-[#0a2d26]" : "text-rose-600"
              }`}
            >
              {confirmModal.type === "valider" ? (
                <>
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Confirmer l&apos;inscription
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600" />
                  Refuser la demande
                </>
              )}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-slate-600 leading-relaxed">
              {confirmModal.type === "valider" ? (
                <>
                  Voulez-vous vraiment inscrire l&apos;élève <strong>{confirmModal.userName}</strong> à la formation <strong>&ldquo;{confirmModal.formationTitre}&rdquo;</strong> ?
                  <br />
                  <span className="text-emerald-700 text-xs mt-2.5 block font-medium">
                    ✓ L&apos;élève aura immédiatement accès à son espace de cours et aux contenus.
                  </span>
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir refuser la demande d&apos;inscription de <strong>{confirmModal.userName}</strong> pour la formation <strong>&ldquo;{confirmModal.formationTitre}&rdquo;</strong> ?
                  <br />
                  <span className="text-rose-600 text-xs mt-2.5 block font-medium">
                    ⚠️ La demande passera au statut Refusée.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 pt-4 border-t mt-3">
            <button
              className="inline-flex items-center justify-center rounded-xl text-xs font-bold transition-colors bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 h-10 px-4 cursor-pointer"
              onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
              disabled={!!processingId}
            >
              Annuler
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-xl text-xs font-bold transition-colors text-white h-10 px-4 disabled:opacity-50 gap-2 cursor-pointer ${
                confirmModal.type === "valider"
                  ? "bg-[#0a2d26] hover:bg-[#0a2d26]/90"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
              onClick={handleConfirmAction}
              disabled={!!processingId}
            >
              {processingId ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Traitement...
                </>
              ) : confirmModal.type === "valider" ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Confirmer l&apos;inscription
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  Confirmer le refus
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
