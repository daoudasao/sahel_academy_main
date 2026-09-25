"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  EVENEMENT_SIGNALEMENTS,
  signalementsApi,
  type MotifSignalement,
  type Signalement,
  type TypeSignalement,
} from "@/app/lib/api";
import InfoBanner from "@/app/components/InfoBanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Flag,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Search,
  Loader2,
  User,
  MessageSquare,
} from "lucide-react";

const LIBELLES_TYPE: Record<TypeSignalement, string> = {
  message_classe: "Message de classe",
  commentaire_classe: "Réponse dans une classe",
  commentaire_post: "Commentaire d'actualité",
};

const LIBELLES_MOTIF: Record<MotifSignalement, string> = {
  spam: "Spam ou publicité",
  harcelement: "Harcèlement ou intimidation",
  contenu_inapproprie: "Contenu inapproprié",
  discours_haineux: "Propos haineux",
  fausse_information: "Fausse information",
  autre: "Autre",
};

type Filtre = "en_attente" | "traite" | "rejete" | "tous";

const formaterDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function SignalementsPage() {
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("en_attente");
  const [search, setSearch] = useState("");

  // Décision en cours de confirmation
  const [decision, setDecision] = useState<{
    signalement: Signalement;
    type: "supprimer" | "rejeter";
  } | null>(null);
  const [note, setNote] = useState("");
  const [enTraitement, setEnTraitement] = useState(false);

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      setSignalements(await signalementsApi.list());
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  };

  // Premier chargement (loading vaut déjà true)
  useEffect(() => {
    signalementsApi
      .list()
      .then(setSignalements)
      .catch((err) => setErreur(err instanceof Error ? err.message : "Chargement impossible"))
      .finally(() => setLoading(false));
  }, []);

  const confirmer = async () => {
    if (!decision) return;
    setEnTraitement(true);
    try {
      await signalementsApi.traiter(decision.signalement.id, {
        decision: decision.type,
        note: note.trim() || undefined,
      });
      setDecision(null);
      setNote("");
      window.dispatchEvent(new Event(EVENEMENT_SIGNALEMENTS));
      await charger();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors du traitement");
    } finally {
      setEnTraitement(false);
    }
  };

  const nbEnAttente = signalements.filter((s) => s.statut === "en_attente").length;
  const nbTraites = signalements.filter((s) => s.statut === "traite").length;
  const nbRejetes = signalements.filter((s) => s.statut === "rejete").length;

  const affiches = signalements.filter((s) => {
    if (filtre !== "tous" && s.statut !== filtre) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [s.contenu, s.auteurNom, s.signalePar?.nom, s.signalePar?.email, s.formationTitre]
      .some((v) => (v ?? "").toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111c24] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Signalements</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Messages et commentaires signalés par les utilisateurs de l&apos;application.
            </p>
          </div>
        </div>
        <button
          onClick={charger}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#15222e] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      <InfoBanner variant="warning" title="À traiter sous 24 heures">
        Google Play et l&apos;App Store exigent que les contenus signalés soient examinés rapidement.
        « Supprimer le contenu » le retire de l&apos;application ; « Conserver » le laisse en ligne.
        Dans les deux cas, les personnes qui l&apos;ont signalé reçoivent une notification. Pour un
        auteur récidiviste, ouvrez sa fiche et désactivez son compte.
      </InfoBanner>

      {/* Compteurs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "En attente", valeur: nbEnAttente, icone: Clock, couleur: "amber" },
          { label: "Contenus retirés", valeur: nbTraites, icone: Trash2, couleur: "rose" },
          { label: "Contenus conservés", valeur: nbRejetes, icone: ShieldCheck, couleur: "emerald" },
        ].map(({ label, valeur, icone: Icone, couleur }) => (
          <div
            key={label}
            className={`bg-white dark:bg-[#111c24] p-4 rounded-xl border shadow-xs flex items-center gap-3 ${
              couleur === "amber"
                ? "border-amber-200/80 dark:border-amber-900/60"
                : couleur === "rose"
                ? "border-rose-200/80 dark:border-rose-900/60"
                : "border-emerald-200/80 dark:border-emerald-900/60"
            }`}
          >
            <div
              className={`p-3 rounded-lg ${
                couleur === "amber"
                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                  : couleur === "rose"
                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <Icone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{valeur}</div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#111c24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {(
            [
              { id: "en_attente", label: `En attente (${nbEnAttente})` },
              { id: "traite", label: `Retirés (${nbTraites})` },
              { id: "rejete", label: `Conservés (${nbRejetes})` },
              { id: "tous", label: `Tous (${signalements.length})` },
            ] as { id: Filtre; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltre(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filtre === f.id
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
            placeholder="Rechercher un contenu, un nom…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#15222e] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-[#0a2d26] dark:focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Liste */}
      {loading && signalements.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm font-medium">Chargement des signalements…</div>
      ) : erreur ? (
        <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 text-sm font-medium">{erreur}</div>
      ) : affiches.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111c24] rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <ShieldCheck className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
          <p className="font-bold text-slate-700 dark:text-slate-200">Aucun signalement</p>
          <p className="text-xs text-slate-400 mt-1">
            {filtre === "en_attente" ? "Rien à examiner pour le moment." : "Aucun signalement dans cette catégorie."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {affiches.map((s) => (
            <CarteSignalement
              key={s.id}
              s={s}
              onDecider={(type) => {
                setNote("");
                setDecision({ signalement: s, type });
              }}
            />
          ))}
        </div>
      )}

      {/* Confirmation de décision */}
      <Dialog
        open={!!decision}
        onOpenChange={(open) => {
          if (!open && !enTraitement) setDecision(null);
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle
              className={`flex items-center gap-2 text-lg font-bold ${
                decision?.type === "supprimer" ? "text-rose-600" : "text-[#0a2d26] dark:text-emerald-400"
              }`}
            >
              {decision?.type === "supprimer" ? (
                <>
                  <Trash2 className="w-5 h-5" /> Supprimer le contenu
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" /> Conserver le contenu
                </>
              )}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {decision?.type === "supprimer"
                ? decision.signalement.type === "message_classe"
                  ? "Le message et toutes ses réponses seront supprimés définitivement de la classe."
                  : "Le commentaire sera supprimé définitivement de l'application."
                : "Le contenu reste en ligne. Le signalement est classé."}
              {decision && decision.signalement.nbSignalements > 1 && (
                <span className="block mt-2 text-xs font-medium">
                  La décision s&apos;applique aux {decision.signalement.nbSignalements} signalements de ce contenu.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">
            Note interne (facultative)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Pourquoi cette décision ? (visible par l'équipe uniquement)"
              className="mt-1.5 w-full px-3 py-2 bg-slate-50 dark:bg-[#15222e] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-[#0a2d26] dark:focus:border-emerald-500"
            />
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t mt-2">
            <button
              className="inline-flex items-center justify-center rounded-xl text-xs font-bold bg-white dark:bg-transparent border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 h-10 px-4 cursor-pointer"
              onClick={() => setDecision(null)}
              disabled={enTraitement}
            >
              Annuler
            </button>
            <button
              className={`inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold text-white h-10 px-4 disabled:opacity-50 cursor-pointer ${
                decision?.type === "supprimer"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-[#0a2d26] hover:bg-[#0a2d26]/90 dark:bg-emerald-600"
              }`}
              onClick={confirmer}
              disabled={enTraitement}
            >
              {enTraitement && <Loader2 className="w-4 h-4 animate-spin" />}
              {decision?.type === "supprimer" ? "Supprimer" : "Conserver"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CarteSignalement({
  s,
  onDecider,
}: {
  s: Signalement;
  onDecider: (type: "supprimer" | "rejeter") => void;
}) {
  const enAttente = s.statut === "en_attente";

  return (
    <div
      className={`bg-white dark:bg-[#111c24] rounded-2xl border shadow-xs p-5 ${
        enAttente ? "border-amber-200 dark:border-amber-900/60" : "border-slate-200/80 dark:border-slate-800"
      }`}
    >
      {/* Ligne du haut : type, contexte, motif */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <MessageSquare className="w-3 h-3" />
          {LIBELLES_TYPE[s.type]}
          {s.formationTitre && <span className="font-medium"> · {s.formationTitre}</span>}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300">
          {LIBELLES_MOTIF[s.motif]}
        </span>
        {s.nbSignalements > 1 && (
          <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white">
            Signalé {s.nbSignalements} fois
          </span>
        )}
        {!s.contenuExiste && enAttente && (
          <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            Déjà supprimé
          </span>
        )}
        <span className="ml-auto text-slate-400 font-medium">{formaterDate(s.createdAt)}</span>
      </div>

      {/* Contenu signalé (copie figée) */}
      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#15222e] border border-slate-200/70 dark:border-slate-700/70">
        <div className="flex items-center gap-2 text-xs mb-1.5">
          <User className="w-3.5 h-3.5 text-slate-400" />
          {s.auteurId ? (
            <Link
              href={`/dashboard/utilisateurs/${s.auteurId}`}
              className="font-bold text-slate-900 dark:text-slate-100 hover:underline"
              title="Ouvrir la fiche de l'auteur"
            >
              {s.auteurNom}
            </Link>
          ) : (
            <span className="font-bold text-slate-900 dark:text-slate-100">{s.auteurNom}</span>
          )}
          {s.auteurRole && <span className="text-slate-400">· {s.auteurRole}</span>}
        </div>
        <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">{s.contenu}</p>
      </div>

      {/* Signalé par */}
      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Signalé par{" "}
        <Link href={`/dashboard/utilisateurs/${s.signalePar.id}`} className="font-bold text-slate-700 dark:text-slate-300 hover:underline">
          {s.signalePar.nom}
        </Link>{" "}
        ({s.signalePar.email})
        {s.details && <p className="mt-1 italic text-slate-600 dark:text-slate-300">« {s.details} »</p>}
      </div>

      {/* Décision ou actions */}
      {enAttente ? (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => onDecider("rejeter")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#15222e] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Conserver
          </button>
          <button
            onClick={() => onDecider("supprimer")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {s.contenuExiste ? "Supprimer le contenu" : "Clore"}
          </button>
        </div>
      ) : (
        <div
          className={`mt-4 flex items-start gap-2 text-xs p-3 rounded-xl ${
            s.statut === "traite"
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />
          <div>
            <span className="font-bold">{s.statut === "traite" ? "Contenu retiré" : "Contenu conservé"}</span>
            {s.traiteParNom && <> par {s.traiteParNom}</>}
            {s.traiteLe && <> · {formaterDate(s.traiteLe)}</>}
            {s.note && <p className="mt-1 text-slate-600 dark:text-slate-400">Note : {s.note}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
