"use client";

import { useState, useEffect } from "react";
import InfoBanner from "@/app/components/InfoBanner";
import {
  getStatutPaiement,
  formatDateTime,
  type TypeNotification,
} from "@/app/lib/mock-data";
import { notificationsApi, usersApi, formationsApi, paiementsApi } from "@/app/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { 
  Send, 
  History, 
  Trash2, 
  Users, 
  BookOpen, 
  AlertTriangle, 
  User, 
  BellRing,
  Globe,
  Check
} from "lucide-react";

type CibleType = "global" | "formation" | "individuel" | "retard";

const typeNotifOptions: { value: TypeNotification; label: string; icon: string }[] = [
  { value: "systeme", label: "Système", icon: "⚙️" },
  { value: "actualite", label: "Actualité", icon: "📰" },
  { value: "paiement", label: "Paiement", icon: "💳" },
  { value: "classe", label: "Classe", icon: "📚" },
];

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<"envoyer" | "historique">("envoyer");
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [apiUsers, setApiUsers] = useState<any[]>([]);
  const [apiFormations, setApiFormations] = useState<any[]>([]);
  const [apiEcheances, setApiEcheances] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      usersApi.list().catch(() => []),
      formationsApi.list().catch(() => []),
      paiementsApi.list().catch(() => []),
    ]).then(([u, f, e]) => { setApiUsers(u); setApiFormations(f); setApiEcheances(e); });
  }, []);

  useEffect(() => {
    if (activeTab === "historique") {
      setLoadingHistory(true);
      notificationsApi.listAdmin().then((data) => {
        setHistoryList(data);
      }).catch(console.error).finally(() => setLoadingHistory(false));
    }
  }, [activeTab]);

  // Form state
  const [cible, setCible] = useState<CibleType>("global");
  const [cibleId, setCibleId] = useState("");
  const [typeNotif, setTypeNotif] = useState<TypeNotification>("systeme");
  const [titre, setTitre] = useState("");
  const [message, setMessage] = useState("");
  
  // Modals state
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Retrieve retard users based on cibleId (if empty, global, else specific formation)
  const getRetardUsers = () => {
    return apiUsers.filter((u: any) => {
      const userEcheances = apiEcheances.filter((e: any) => e.userId === u.id && (!cibleId || e.formationId === cibleId));
      if (userEcheances.length === 0) return false;
      return userEcheances.some((e: any) => getStatutPaiement(e) === "enRetard");
    });
  };

  const getRecipientsCount = () => {
    if (cible === "global") return apiUsers.length;
    if (cible === "retard") return getRetardUsers().length;
    if (cible === "formation" && cibleId) {
      return new Set(apiEcheances.filter((e: any) => e.formationId === cibleId).map((e: any) => e.userId)).size;
    }
    if (cible === "individuel" && cibleId) return 1;
    return 0;
  };
  
  const isFormValid = () => {
    if (!titre.trim() || !message.trim()) return false;
    if (cible === "formation" && !cibleId) return false;
    if (cible === "individuel" && !cibleId) return false;
    if (getRecipientsCount() === 0) return false;
    return true;
  };

  const handleTriggerSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setShowConfirmSend(true);
  };

  const [sending, setSending] = useState(false);

  const executeSend = async () => {
    if (sending) return;
    // Add to history
    let cibleNom = "";
    if (cible === "formation") cibleNom = apiFormations.find((f: any) => f.id === cibleId)?.titre || "";
    if (cible === "individuel") cibleNom = apiUsers.find((u: any) => u.id === cibleId)?.nom || "";
    if (cible === "retard") cibleNom = "Élèves en retard";

    setSending(true);
    try {
      await notificationsApi.create({
        titre: titre.trim(),
        message: message.trim(),
        type: typeNotif,
        // "retard" : le backend crée une notification personnelle par élève en retard.
        cible,
        cibleId: cibleId || undefined,
        cibleNom,
        envoyePar: "Sahel Academy"
      });

      setShowConfirmSend(false);
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setTitre("");
        setMessage("");
        setCibleId("");
      }, 3000);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi de la notification");
    } finally {
      setSending(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await notificationsApi.remove(deletingId);
      setHistoryList(historyList.filter(n => n.id !== deletingId));
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Compact Green Header */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <span>Alertes & Diffusion Push</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Notifications Push
            </h1>
            <p className="text-xs text-emerald-100/75 leading-relaxed">
              Diffusez des messages ciblés ou des rappels en temps réel.
            </p>
          </div>
        </div>
      </div>

      <div className="page-body max-w-[1000px] mx-auto">
        <InfoBanner title="Guide du Ciblages & Envois de Notifications">
          <strong>À quoi ça sert ?</strong> Diffuser des alertes Push directes sur les téléphones des étudiants (urgences, rappels de paiement, actualités de cours).<br />
          <strong>Comment l&apos;utiliser ?</strong> 1. Choisissez la cible (<em>Tous les élèves, Par formation, Individuel ou Élèves en retard</em>). 2. Rédigez le titre et le contenu du message. 3. Cliquez sur <em>"Envoyer la notification"</em> pour la transmettre instantanément.
        </InfoBanner>

        {/* Tabs Modernes */}
        <div className="flex border-b border-slate-200 mb-8">
          <button 
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 relative -bottom-[1px] ${activeTab === "envoyer" ? "text-indigo-600 border-indigo-600" : "text-slate-500 border-transparent hover:text-slate-700"}`}
            onClick={() => setActiveTab("envoyer")}
          >
            <Send className="w-4 h-4" />
            Nouvelle notification
          </button>
          <button 
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 relative -bottom-[1px] ${activeTab === "historique" ? "text-indigo-600 border-indigo-600" : "text-slate-500 border-transparent hover:text-slate-700"}`}
            onClick={() => setActiveTab("historique")}
          >
            <History className="w-4 h-4" />
            Historique d'envoi
            <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs font-bold">{historyList.length}</span>
          </button>
        </div>

        {activeTab === "envoyer" ? (
          <form onSubmit={handleTriggerSend} className="space-y-6">
            {/* Étape 1 : Destinataires */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">1. Choix des destinataires</h3>
                  <p className="text-sm text-slate-500">À qui souhaitez-vous envoyer cette notification ?</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div 
                  className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center text-center gap-3 transition-all ${cible === "global" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:border-indigo-500" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111c24] hover:border-slate-300 dark:hover:border-slate-700"}`}
                  onClick={() => { setCible("global"); setCibleId(""); setTypeNotif("actualite"); }}
                >
                  <Globe className={`w-6 h-6 ${cible === "global" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                  <span className={`font-semibold text-sm ${cible === "global" ? "text-indigo-900 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300"}`}>Tous les élèves</span>
                </div>
                <div 
                  className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center text-center gap-3 transition-all ${cible === "formation" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:border-indigo-500" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111c24] hover:border-slate-300 dark:hover:border-slate-700"}`}
                  onClick={() => { setCible("formation"); setCibleId(""); setTypeNotif("classe"); }}
                >
                  <BookOpen className={`w-6 h-6 ${cible === "formation" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                  <span className={`font-semibold text-sm ${cible === "formation" ? "text-indigo-900 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300"}`}>Par formation</span>
                </div>
                <div 
                  className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center text-center gap-3 transition-all ${cible === "individuel" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:border-indigo-500" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111c24] hover:border-slate-300 dark:hover:border-slate-700"}`}
                  onClick={() => { setCible("individuel"); setCibleId(""); setTypeNotif("systeme"); }}
                >
                  <User className={`w-6 h-6 ${cible === "individuel" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                  <span className={`font-semibold text-sm ${cible === "individuel" ? "text-indigo-900 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300"}`}>Individuel</span>
                </div>
                <div 
                  className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center text-center gap-3 transition-all ${cible === "retard" ? "border-red-500 bg-red-50 dark:bg-red-950/50 dark:border-red-500" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111c24] hover:border-slate-300 dark:hover:border-slate-700"}`}
                  onClick={() => { setCible("retard"); setCibleId(""); setTypeNotif("paiement"); }}
                >
                  <AlertTriangle className={`w-6 h-6 ${cible === "retard" ? "text-red-500 dark:text-red-400" : "text-slate-400"}`} />
                  <span className={`font-semibold text-sm ${cible === "retard" ? "text-red-900 dark:text-red-200" : "text-slate-700 dark:text-slate-300"}`}>En retard de paiement</span>
                </div>
              </div>

              {/* Selecteurs spécifiques */}
              {(cible === "formation" || cible === "retard") && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200 mb-6 bg-slate-50 dark:bg-[#15222e] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Sélectionnez la formation {cible === "formation" && <span className="text-red-500">*</span>}</label>
                  <select 
                    className="w-full md:w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111c24] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100" 
                    value={cibleId} 
                    onChange={(e) => setCibleId(e.target.value)} 
                    required={cible === "formation"}
                  >
                    <option value="">{cible === "retard" ? "Toutes les formations" : "-- Choisir --"}</option>
                    {apiFormations.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.titre}</option>
                    ))}
                  </select>
                </div>
              )}

              {cible === "individuel" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200 mb-6 bg-slate-50 dark:bg-[#15222e] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Sélectionnez l'étudiant <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full md:w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111c24] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100" 
                    value={cibleId} 
                    onChange={(e) => setCibleId(e.target.value)} 
                    required
                  >
                    <option value="">-- Choisir --</option>
                    {apiUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.nom} ({u.email})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Résumé de l'audience */}
              <div className="flex items-center gap-2 p-3 bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 rounded-lg text-sm text-indigo-900 dark:text-indigo-200 font-medium">
                <BellRing className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span>Cette notification sera envoyée à <strong>{getRecipientsCount()}</strong> destinataire{getRecipientsCount() > 1 ? "s" : ""}.</span>
              </div>
            </div>

            {/* Étape 2 : Contenu */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">2. Message de la notification</h3>
                  <p className="text-sm text-slate-500">Rédigez le contenu qui s'affichera sur l'écran du destinataire.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Type de notification</label>
                  <select 
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={typeNotif} 
                    onChange={(e) => setTypeNotif(e.target.value as TypeNotification)}
                  >
                    {typeNotifOptions.map((t) => (
                      <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Titre <span className="text-red-500">*</span></label>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    type="text"
                    placeholder="Ex: Rappel d'échéance"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Message détaillé <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[120px]"
                  placeholder="Écrivez le message complet ici..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Validation */}
            <div className="flex items-center gap-4">
              <button 
                type="submit" 
                className="bg-[#0a2d26] hover:bg-[#0a2d26]/90 text-white px-8 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                disabled={!isFormValid()}
              >
                <Send className="w-5 h-5" />
                Envoyer la notification
              </button>
              {sentSuccess && (
                <span className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg animate-in fade-in">
                  <Check className="w-5 h-5" /> Envoyé avec succès !
                </span>
              )}
            </div>
          </form>
        ) : (
          /* Onglet Historique */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="overflow-x-auto">
              <div className="table-responsive">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <th className="px-6 py-4 font-semibold w-40">Date</th>
                    <th className="px-6 py-4 font-semibold">Titre & Message</th>
                    <th className="px-6 py-4 font-semibold">Type</th>
                    <th className="px-6 py-4 font-semibold">Audience ciblée</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyList.sort((a, b) => (new Date(b.date).getTime() - new Date(a.date).getTime())).map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(n.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 mb-1">{n.titre}</div>
                        <div className="text-slate-600 line-clamp-2 pr-4">{n.message}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          n.type === "systeme" ? "bg-slate-100 text-slate-600" : 
                          n.type === "paiement" ? "bg-red-100 text-red-700" : 
                          n.type === "classe" ? "bg-indigo-100 text-indigo-700" : 
                          "bg-emerald-100 text-emerald-700"
                        }`}>
                          {n.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">
                        {n.cibleNom || (n.cible === "global" ? "Tous les élèves" : n.cible)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => setDeletingId(n.id)}
                          title="Supprimer l'historique"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {loadingHistory && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 bg-slate-50">
                        Chargement...
                      </td>
                    </tr>
                  )}
                  {!loadingHistory && historyList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 bg-slate-50">
                        Aucune notification dans l'historique.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Confirmation d'Envoi */}
      <Dialog open={showConfirmSend} onOpenChange={setShowConfirmSend}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <Send className="w-5 h-5" />
              Confirmer l'envoi
            </DialogTitle>
            <DialogDescription className="pt-3">
              Vous êtes sur le point d'envoyer une notification à <strong>{getRecipientsCount()}</strong> destinataire(s).<br/><br/>
              Les destinataires recevront immédiatement une alerte sur leur appareil. Êtes-vous sûr de vouloir continuer ?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4 mt-2">
            <button 
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              onClick={() => setShowConfirmSend(false)}
            >
              Annuler
            </button>
            <button 
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              onClick={executeSend}
              disabled={sending}
            >
              <Send className="w-4 h-4" /> {sending ? "Envoi..." : "Confirmer l'envoi"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Suppression d'Historique */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Supprimer l'historique
            </DialogTitle>
            <DialogDescription className="pt-3">
              Êtes-vous sûr de vouloir supprimer cette trace de notification ?<br/><br/>
              Cette action est irréversible et retirera l'entrée de l'historique d'envoi.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4 mt-2">
            <button 
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              onClick={() => setDeletingId(null)}
            >
              Annuler
            </button>
            <button 
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
              onClick={handleConfirmDelete}
            >
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
