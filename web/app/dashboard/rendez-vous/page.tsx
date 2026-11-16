"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  rendezVousApi,
  type RendezVous,
  type StatutRendezVous,
} from "@/app/lib/api";
import { useSession } from "@/app/lib/auth-client";
import InfoBanner from "@/app/components/InfoBanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  RefreshCw,
  Search,
  Trash2,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  Loader2,
} from "lucide-react";

const STATUTS: Record<
  StatutRendezVous,
  { label: string; badge: string }
> = {
  en_attente: {
    label: "En attente",
    badge: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  },
  confirme: {
    label: "Confirmé",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  },
  annule: {
    label: "Annulé",
    badge: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
  },
  honore: {
    label: "Honoré",
    badge: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900",
  },
};

type Filtre = "a_venir" | StatutRendezVous | "tous";

const formaterDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const estAVenir = (r: RendezVous) =>
  new Date(r.dateHeure).getTime() >= Date.now() - 2 * 3600_000 &&
  (r.statut === "en_attente" || r.statut === "confirme");

export default function RendezVousPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role?.toUpperCase();
  // Doit rester aligné sur RendezVousController.remove (backend)
  const peutSupprimer = role === "CHEF_CENTRE" || role === "SUPER_ADMIN";

  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("a_venir");
  const [search, setSearch] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);

  // Note interne en cours d'édition
  const [noteRdv, setNoteRdv] = useState<RendezVous | null>(null);
  const [note, setNote] = useState("");
  // Suppression (corbeille)
  const [aSupprimer, setASupprimer] = useState<RendezVous | null>(null);

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      setRdvs(await rendezVousApi.list());
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    rendezVousApi
      .list()
      .then(setRdvs)
      .catch((err) => setErreur(err instanceof Error ? err.message : "Chargement impossible"))
      .finally(() => setLoading(false));
  }, []);

  const remplacer = (maj: RendezVous) =>
    setRdvs((liste) => liste.map((r) => (r.id === maj.id ? maj : r)));

  const changerStatut = async (r: RendezVous, statut: StatutRendezVous) => {
    if (r.statut === statut) return;
    setEnCours(r.id);
    try {
      remplacer(await rendezVousApi.update(r.id, { statut }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setEnCours(null);
    }
  };

  const enregistrerNote = async () => {
    if (!noteRdv) return;
    setEnCours(noteRdv.id);
    try {
      remplacer(await rendezVousApi.update(noteRdv.id, { noteAdmin: note }));
      setNoteRdv(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setEnCours(null);
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    setEnCours(aSupprimer.id);
    try {
      await rendezVousApi.remove(aSupprimer.id);
      setRdvs((liste) => liste.filter((r) => r.id !== aSupprimer.id));
      setASupprimer(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setEnCours(null);
    }
  };

  const compte = (f: Filtre) =>
    f === "tous"
      ? rdvs.length
      : f === "a_venir"
      ? rdvs.filter(estAVenir).length
      : rdvs.filter((r) => r.statut === f).length;

  const affiches = rdvs
    .filter((r) => {
      if (filtre === "a_venir" ? !estAVenir(r) : filtre !== "tous" && r.statut !== filtre) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [r.user?.nom, r.user?.email, r.user?.telephone, r.centre?.nom, r.centre?.ville, r.motif]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    })
    // À venir : le plus proche d'abord ; sinon le plus récent d'abord.
    .sort((a, b) =>
      filtre === "a_venir"
        ? a.dateHeure.localeCompare(b.dateHeure)
        : b.dateHeure.localeCompare(a.dateHeure)
    );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111c24] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-xl">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Rendez-vous</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rendez-vous pris par les utilisateurs depuis l&apos;application, dans les{" "}
              <Link href="/dashboard/centres" className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                centres
              </Link>
              .
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

      <InfoBanner>
        Confirmez ou annulez chaque demande : l&apos;utilisateur reçoit aussitôt une notification dans
        l&apos;application. Après la visite, marquez le rendez-vous « Honoré ».
      </InfoBanner>

      {/* Compteurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "En attente", valeur: compte("en_attente"), icone: Clock, classe: "text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400" },
          { label: "Confirmés", valeur: compte("confirme"), icone: CheckCircle2, classe: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400" },
          { label: "Honorés", valeur: compte("honore"), icone: UserCheck, classe: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400" },
          { label: "Annulés", valeur: compte("annule"), icone: XCircle, classe: "text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400" },
        ].map(({ label, valeur, icone: Icone, classe }) => (
          <div
            key={label}
            className="bg-white dark:bg-[#111c24] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3"
          >
            <div className={`p-3 rounded-lg ${classe}`}>
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
              { id: "a_venir", label: "À venir" },
              { id: "en_attente", label: "En attente" },
              { id: "confirme", label: "Confirmés" },
              { id: "honore", label: "Honorés" },
              { id: "annule", label: "Annulés" },
              { id: "tous", label: "Tous" },
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
              {f.label} ({compte(f.id)})
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Nom, téléphone, centre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#15222e] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-[#0a2d26] dark:focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Liste */}
      {loading && rdvs.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm font-medium">Chargement des rendez-vous…</div>
      ) : erreur ? (
        <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 text-sm font-medium">{erreur}</div>
      ) : affiches.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111c24] rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <CalendarCheck className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
          <p className="font-bold text-slate-700 dark:text-slate-200">Aucun rendez-vous</p>
          <p className="text-xs text-slate-400 mt-1">
            {filtre === "a_venir" ? "Aucun rendez-vous à venir pour le moment." : "Aucun rendez-vous dans cette catégorie."}
          </p>
        </div>
      ) : (
        <div className="table-responsive bg-white dark:bg-[#111c24] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#15222e] border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Utilisateur</th>
                <th className="py-3.5 px-4">Date &amp; centre</th>
                <th className="py-3.5 px-4">Motif</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {affiches.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors align-top">
                  <td className="py-3.5 px-4">
                    <Link
                      href={`/dashboard/utilisateurs/${r.user.id}`}
                      className="font-bold text-slate-900 dark:text-white hover:underline"
                    >
                      {r.user.nom}
                    </Link>
                    <div className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {r.user.telephone && (
                        <a href={`tel:${r.user.telephone}`} className="flex items-center gap-1.5 hover:text-emerald-700">
                          <Phone className="w-3 h-3" /> {r.user.telephone}
                        </a>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> {r.user.email}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="font-bold text-slate-800 dark:text-slate-100 capitalize">{formaterDate(r.dateHeure)}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3 h-3" /> {r.centre.nom} · {r.centre.ville}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">Demandé le {formaterDate(r.createdAt)}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-[240px]">
                    {r.motif || <span className="italic text-slate-400">Non précisé</span>}
                    {r.noteAdmin && (
                      <div className="mt-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-bold">Note : </span>
                        {r.noteAdmin}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={r.statut}
                      disabled={enCours === r.id}
                      onChange={(e) => changerStatut(r, e.target.value as StatutRendezVous)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold outline-none cursor-pointer disabled:opacity-50 ${STATUTS[r.statut].badge}`}
                      aria-label="Statut du rendez-vous"
                    >
                      {(Object.keys(STATUTS) as StatutRendezVous[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUTS[s].label}
                        </option>
                      ))}
                    </select>
                    {enCours === r.id && <Loader2 className="inline w-3.5 h-3.5 ml-2 animate-spin text-slate-400" />}
                    {r.traiteParNom && (
                      <div className="mt-1 text-[11px] text-slate-400">par {r.traiteParNom}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setNote(r.noteAdmin ?? "");
                          setNoteRdv(r);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#15222e] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
                        title="Note interne"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Note
                      </button>
                      {peutSupprimer && (
                        <button
                          onClick={() => setASupprimer(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-700 dark:text-red-300 font-semibold text-xs transition cursor-pointer"
                          title="Envoyer à la corbeille"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Note interne */}
      <Dialog open={!!noteRdv} onOpenChange={(open) => !open && setNoteRdv(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0a2d26] dark:text-emerald-400 text-lg font-bold">
              <MessageSquare className="w-5 h-5" />
              Note interne
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
              Visible uniquement par l&apos;équipe, jamais par {noteRdv?.user.nom ?? "l'utilisateur"}.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Ex. : a appelé pour décaler, dossier incomplet…"
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#15222e] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-[#0a2d26] dark:focus:border-emerald-500"
          />
          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
            <button
              onClick={() => setNoteRdv(null)}
              className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              onClick={enregistrerNote}
              disabled={enCours === noteRdv?.id}
              className="h-10 px-5 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-semibold text-xs disabled:opacity-50 cursor-pointer"
            >
              {enCours === noteRdv?.id ? "Enregistrement…" : "Enregistrer la note"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppression → corbeille */}
      <Dialog open={!!aSupprimer} onOpenChange={(open) => !open && setASupprimer(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 text-lg font-bold">
              <Trash2 className="w-5 h-5" />
              Supprimer le rendez-vous
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Le rendez-vous de <strong>{aSupprimer?.user.nom}</strong> sera envoyé dans la Corbeille ; vous
              pourrez le restaurer à tout moment. Pour simplement l&apos;annuler (et prévenir
              l&apos;utilisateur), changez plutôt son statut.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2 border-t mt-3">
            <button
              onClick={() => setASupprimer(null)}
              className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              onClick={supprimer}
              disabled={enCours === aSupprimer?.id}
              className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs disabled:opacity-50 cursor-pointer"
            >
              {enCours === aSupprimer?.id ? "Suppression…" : "Envoyer à la corbeille"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
