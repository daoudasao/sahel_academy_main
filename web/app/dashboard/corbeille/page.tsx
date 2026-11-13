"use client";

import { useEffect, useState } from "react";
import { corbeilleApi, type ElementCorbeille, type TypeCorbeille } from "@/app/lib/api";
import { useSession } from "@/app/lib/auth-client";
import { isSuperAdminRole } from "@/app/lib/permissions";
import InfoBanner from "@/app/components/InfoBanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Trash2, RotateCcw, RefreshCw, Search, Loader2, Inbox } from "lucide-react";

const LIBELLES_TYPE: Record<TypeCorbeille, string> = {
  bourse: "Bourse",
  formation: "Formation",
  centre: "Centre",
  departement: "Département",
  actualite: "Actualité",
};

/** Ce que la suppression définitive emporte avec l'élément. */
const PERTES_DEFINITIVES: Record<TypeCorbeille, string> = {
  bourse: "la bourse, son formulaire et toutes ses candidatures",
  formation: "la formation, ses inscriptions, échéances, paiements, messages et documents de classe",
  centre: "le centre et ses créneaux",
  departement: "le département",
  actualite: "la publication, ses médias et ses commentaires",
};

type Filtre = TypeCorbeille | "tous";

const formaterDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function CorbeillePage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const superAdmin = isSuperAdminRole(role);

  const [elements, setElements] = useState<ElementCorbeille[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [search, setSearch] = useState("");

  // Élément en cours d'action (restauration ou suppression définitive)
  const [enCours, setEnCours] = useState<string | null>(null);
  const [aEffacer, setAEffacer] = useState<ElementCorbeille | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      setElements(await corbeilleApi.list());
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    corbeilleApi
      .list()
      .then(setElements)
      .catch((err) => setErreur(err instanceof Error ? err.message : "Chargement impossible"))
      .finally(() => setLoading(false));
  }, []);

  const cle = (e: ElementCorbeille) => `${e.type}:${e.id}`;

  const restaurer = async (e: ElementCorbeille) => {
    setEnCours(cle(e));
    setMessage(null);
    try {
      await corbeilleApi.restaurer(e.type, e.id);
      setElements((prev) => prev.filter((x) => cle(x) !== cle(e)));
      setMessage(`« ${e.titre} » a été restauré(e).`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Restauration impossible");
    } finally {
      setEnCours(null);
    }
  };

  const effacer = async () => {
    if (!aEffacer) return;
    const e = aEffacer;
    setEnCours(cle(e));
    try {
      await corbeilleApi.supprimerDefinitivement(e.type, e.id);
      setElements((prev) => prev.filter((x) => cle(x) !== cle(e)));
      setAEffacer(null);
      setMessage(`« ${e.titre} » a été supprimé(e) définitivement.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Suppression impossible");
    } finally {
      setEnCours(null);
    }
  };

  const compte = (t: TypeCorbeille) => elements.filter((e) => e.type === t).length;

  const affiches = elements.filter((e) => {
    if (filtre !== "tous" && e.type !== filtre) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [e.titre, e.detail, e.deletedByNom].some((v) => (v ?? "").toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111c24] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Corbeille</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Éléments supprimés : restaurez-les en un clic s&apos;ils l&apos;ont été par erreur.
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

      <InfoBanner variant="info" title="Comment ça marche">
        Une bourse, une formation, un centre, un département ou une actualité supprimé n&apos;est plus
        effacé : il disparaît du site et de l&apos;application mais reste ici, avec toutes ses données
        (candidatures, inscriptions, paiements…). « Restaurer » le remet exactement comme avant.
        {superAdmin
          ? " En tant que super admin, vous pouvez aussi le supprimer définitivement."
          : " Seul un super admin peut supprimer définitivement."}
      </InfoBanner>

      {message && (
        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm font-medium">
          {message}
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#111c24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {(
            [
              { id: "tous", label: `Tout (${elements.length})` },
              ...(Object.keys(LIBELLES_TYPE) as TypeCorbeille[]).map((t) => ({
                id: t,
                label: `${LIBELLES_TYPE[t]}s (${compte(t)})`,
              })),
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
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#15222e] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-[#0a2d26] dark:focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Liste */}
      {loading && elements.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm font-medium">Chargement de la corbeille…</div>
      ) : erreur ? (
        <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 text-sm font-medium">{erreur}</div>
      ) : affiches.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111c24] rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Inbox className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-700 dark:text-slate-200">La corbeille est vide</p>
          <p className="text-xs text-slate-400 mt-1">Les éléments supprimés apparaîtront ici.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111c24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
          {affiches.map((e) => {
            const occupe = enCours === cle(e);
            return (
              <div key={cle(e)} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {LIBELLES_TYPE[e.type]}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 break-words">{e.titre}</span>
                    {e.detail && <span className="text-xs text-slate-400">· {e.detail}</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Supprimé le {formaterDate(e.deletedAt)}
                    {e.deletedByNom && (
                      <>
                        {" "}par <span className="font-semibold">{e.deletedByNom}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => restaurer(e)}
                    disabled={!!enCours}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a2d26] hover:bg-[#0a2d26]/90 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {occupe && !aEffacer ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    Restaurer
                  </button>
                  {superAdmin && (
                    <button
                      onClick={() => setAEffacer(e)}
                      disabled={!!enCours}
                      title="Supprimer définitivement"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation de suppression définitive */}
      <Dialog
        open={!!aEffacer}
        onOpenChange={(open) => {
          if (!open && !enCours) setAEffacer(null);
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-rose-600">
              <Trash2 className="w-5 h-5" /> Supprimer définitivement
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {aEffacer && (
                <>
                  « {aEffacer.titre} » ne pourra plus être restauré. Seront effacés :{" "}
                  {PERTES_DEFINITIVES[aEffacer.type]}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4 border-t mt-2">
            <button
              className="inline-flex items-center justify-center rounded-xl text-xs font-bold bg-white dark:bg-transparent border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 h-10 px-4 cursor-pointer"
              onClick={() => setAEffacer(null)}
              disabled={!!enCours}
            >
              Annuler
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold text-white h-10 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              onClick={effacer}
              disabled={!!enCours}
            >
              {enCours && <Loader2 className="w-4 h-4 animate-spin" />}
              Supprimer définitivement
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
