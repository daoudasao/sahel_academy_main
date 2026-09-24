"use client";

import React, { useEffect, useMemo, useState } from "react";
import InfoBanner from "@/app/components/InfoBanner";
import {
  auditApi,
  type ActionAudit,
  type AuditFiltres,
  type AuditLog,
} from "@/app/lib/api";
import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogIn,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";

// ─── Libellés ───

const ACTIONS: Record<ActionAudit, { label: string; badge: string }> = {
  CREATION: { label: "Création", badge: "badge-success" },
  MODIFICATION: { label: "Modification", badge: "badge-info" },
  SUPPRESSION: { label: "Suppression", badge: "badge-danger" },
  CONNEXION: { label: "Connexion", badge: "badge-neutral" },
  ATTRIBUTION_ROLE: { label: "Attribution de rôle", badge: "badge-purple" },
};

const RESSOURCES: Record<string, string> = {
  users: "Utilisateurs",
  bourses: "Bourses",
  formations: "Formations",
  departements: "Départements",
  centres: "Centres",
  formateurs: "Formateurs",
  paiements: "Paiements",
  actualites: "Actualités",
  notifications: "Notifications",
  support: "Support",
  classes: "Classes",
  upload: "Fichiers",
  auth: "Authentification",
  "espace-formateur": "Espace formateur",
};

const ROLES: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrateur",
  STAFF: "Staff",
  SUPPORT: "Support",
  COMPTABLE: "Comptable",
  RESPONSABLE_PEDAGOGIQUE: "Resp. pédagogique",
  COMMUNITY_MANAGER: "Community manager",
  FORMATEUR: "Formateur",
  ETUDIANT: "Étudiant",
};

const libelleRessource = (r: string) => RESSOURCES[r] ?? r;
const libelleRole = (r?: string | null) => (r ? ROLES[r] ?? r : "—");

/** Phrase lisible décrivant l'action (« a supprimé « X » (Bourses) »). */
function decrire(log: AuditLog): string {
  const cible = log.libelle
    ? `« ${log.libelle} »`
    : log.ressourceId
      ? `#${log.ressourceId.slice(0, 8)}`
      : "";
  const corps = (log.details?.corps ?? {}) as Record<string, unknown>;
  const tente = !log.succes;

  if (log.action === "CONNEXION") return "S'est connecté(e) au tableau de bord";
  if (log.action === "ATTRIBUTION_ROLE") {
    const role = libelleRole(String(log.details?.nouveauRole ?? ""));
    return `Rôle ${role} attribué à ${cible} (variable SUPER_ADMIN_EMAILS)`;
  }
  if (log.ressource === "users" && log.route.endsWith("/password")) {
    return `${tente ? "A tenté de réinitialiser" : "A réinitialisé"} le mot de passe de ${cible}`;
  }
  if (log.ressource === "users" && typeof corps.role === "string") {
    return `${tente ? "A tenté de changer" : "A changé"} le rôle de ${cible} en ${libelleRole(corps.role)}`;
  }
  const verbes: Record<string, [string, string]> = {
    CREATION: ["A créé", "A tenté de créer"],
    MODIFICATION: ["A modifié", "A tenté de modifier"],
    SUPPRESSION: ["A supprimé", "A tenté de supprimer"],
  };
  const [ok, ko] = verbes[log.action] ?? ["A agi sur", "A tenté d'agir sur"];
  return `${tente ? ko : ok} ${cible || "un élément"} (${libelleRessource(log.ressource)})`;
}

const formaterDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });

// Période saisie en jours (heure locale) → bornes ISO envoyées à l'API.
const debutJour = (jour: string) => new Date(`${jour}T00:00:00`).toISOString();
const finJour = (jour: string) => new Date(`${jour}T23:59:59.999`).toISOString();

type Page = { items: AuditLog[]; total: number; page: number; pages: number };
type Resume = { actions: number; suppressions: number; echecs: number; connexions: number };
type Options = {
  ressources: string[];
  utilisateurs: { id: string; nom: string | null; email: string | null; role: string | null }[];
};

const FILTRES_VIDES: AuditFiltres = { page: 1, limite: 50 };

export default function JournalAuditPage() {
  const [filtres, setFiltres] = useState<AuditFiltres>(FILTRES_VIDES);
  const [recherche, setRecherche] = useState("");
  const [jours, setJours] = useState({ du: "", au: "" });
  const [donnees, setDonnees] = useState<Page | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [options, setOptions] = useState<Options>({ ressources: [], utilisateurs: [] });
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  // Incrémentée par « Rafraîchir » pour relancer les chargements.
  const [version, setVersion] = useState(0);
  // Requête pour laquelle les données affichées ont été reçues.
  const [chargeePour, setChargeePour] = useState<string | null>(null);

  // Recherche libre : appliquée 400 ms après la dernière frappe.
  useEffect(() => {
    const t = setTimeout(() => {
      const valeur = recherche.trim() || undefined;
      setFiltres((f) => (f.recherche === valeur ? f : { ...f, recherche: valeur, page: 1 }));
    }, 400);
    return () => clearTimeout(t);
  }, [recherche]);

  const requete = useMemo<AuditFiltres>(
    () => ({
      ...filtres,
      du: jours.du ? debutJour(jours.du) : undefined,
      au: jours.au ? finJour(jours.au) : undefined,
    }),
    [filtres, jours]
  );

  // Le chargement est « en cours » tant que les données reçues ne
  // correspondent pas à la requête actuelle (état dérivé, pas de setState
  // synchrone dans l'effet).
  const cle = `${JSON.stringify(requete)}#${version}`;
  const chargement = chargeePour !== cle;

  useEffect(() => {
    // Réponse périmée (filtres changés entre-temps) : ignorée.
    let annule = false;
    auditApi.list(requete).then(
      (page) => {
        if (annule) return;
        setDonnees(page);
        setErreur(null);
        setChargeePour(cle);
      },
      (e: unknown) => {
        if (annule) return;
        setErreur(e instanceof Error ? e.message : "Chargement du journal impossible.");
        setChargeePour(cle);
      }
    );
    return () => {
      annule = true;
    };
  }, [cle, requete]);

  // Résumé 24 h et valeurs des filtres : au chargement et à chaque rafraîchissement.
  useEffect(() => {
    let annule = false;
    Promise.all([auditApi.resume(), auditApi.filtres()]).then(
      ([r, o]) => {
        if (annule) return;
        setResume(r);
        setOptions(o);
      },
      () => {
        /* l'erreur principale est affichée par le chargement du journal */
      }
    );
    return () => {
      annule = true;
    };
  }, [version]);

  const rafraichir = () => setVersion((v) => v + 1);

  const changer = (patch: Partial<AuditFiltres>) =>
    setFiltres((f) => ({ ...f, ...patch, page: 1 }));

  const reinitialiser = () => {
    setRecherche("");
    setJours({ du: "", au: "" });
    setFiltres(FILTRES_VIDES);
  };

  const filtresActifs =
    !!recherche || !!jours.du || !!jours.au ||
    !!filtres.action || !!filtres.ressource || !!filtres.userId || !!filtres.succes;

  const page = donnees?.page ?? 1;
  const pages = donnees?.pages ?? 1;

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Header vert compact */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
            <ScrollText className="w-3 h-3" />
            <span>Supervision · Super Admin</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Journal d&apos;audit
            <button
              onClick={rafraichir}
              title="Rafraîchir le journal"
              className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${chargement ? "animate-spin" : ""}`} />
            </button>
          </h1>
          <p className="text-xs text-emerald-100/75 leading-relaxed">
            Qui a fait quoi, quand et sur quel élément : toutes les actions de l&apos;équipe sur la plateforme.
          </p>
        </div>
      </div>

      {/* Cartes : dernières 24 h */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Actions", value: resume?.actions, icon: Activity, color: "text-blue-600", hint: "Créations, modifications, suppressions (24 h)" },
          { label: "Suppressions", value: resume?.suppressions, icon: Trash2, color: "text-red-600", hint: "Éléments supprimés ou tentés (24 h)" },
          { label: "Échecs & refus", value: resume?.echecs, icon: ShieldAlert, color: "text-amber-600", hint: "Actions refusées ou en erreur (24 h)" },
          { label: "Connexions", value: resume?.connexions, icon: LogIn, color: "text-emerald-600", hint: "Connexions de l'équipe (24 h)" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card text-card-foreground shadow-sm bg-white p-3.5 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-row items-center justify-between space-y-0 pb-1.5">
                <h3 className="tracking-tight text-xs sm:text-sm font-medium text-slate-500 truncate" title={s.label}>{s.label}</h3>
                <s.icon className={`h-4 w-4 ${s.color} shrink-0 ml-1`} />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{s.value ?? "—"}</div>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-1">{s.hint}</p>
          </div>
        ))}
      </div>

      <InfoBanner>
        <strong>Ce qui est tracé :</strong> créations, modifications et suppressions faites par l&apos;équipe, connexions au tableau de bord, et tentatives refusées faute de droits.<br />
        <strong>Données sensibles :</strong> les mots de passe et jetons ne sont jamais enregistrés. Le journal est en lecture seule : aucune trace ne peut être modifiée ou effacée.
      </InfoBanner>

      {/* Filtres */}
      <div className="card p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              className="form-input w-full"
              style={{ paddingLeft: 34 }}
              placeholder="Rechercher un auteur, un e-mail, un élément, un identifiant…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
          <select
            className="form-input w-full"
            value={filtres.action ?? ""}
            onChange={(e) => changer({ action: (e.target.value || undefined) as ActionAudit | undefined })}
          >
            <option value="">Toutes les actions</option>
            {(Object.keys(ACTIONS) as ActionAudit[]).map((a) => (
              <option key={a} value={a}>{ACTIONS[a].label}</option>
            ))}
          </select>
          <select
            className="form-input w-full"
            value={filtres.succes ?? ""}
            onChange={(e) => changer({ succes: (e.target.value || undefined) as "true" | "false" | undefined })}
          >
            <option value="">Tous les résultats</option>
            <option value="true">Réussies</option>
            <option value="false">Échecs & refus</option>
          </select>
          <select
            className="form-input w-full"
            value={filtres.userId ?? ""}
            onChange={(e) => changer({ userId: e.target.value || undefined })}
          >
            <option value="">Tous les auteurs</option>
            {options.utilisateurs.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nom || u.email} {u.role ? `· ${libelleRole(u.role)}` : ""}
              </option>
            ))}
          </select>
          <select
            className="form-input w-full"
            value={filtres.ressource ?? ""}
            onChange={(e) => changer({ ressource: e.target.value || undefined })}
          >
            <option value="">Toutes les ressources</option>
            {options.ressources.map((r) => (
              <option key={r} value={r}>{libelleRessource(r)}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">Du</span>
            <input
              type="date"
              className="form-input w-full"
              value={jours.du}
              max={jours.au || undefined}
              onChange={(e) => {
                setJours((j) => ({ ...j, du: e.target.value }));
                changer({});
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">Au</span>
            <input
              type="date"
              className="form-input w-full"
              value={jours.au}
              min={jours.du || undefined}
              onChange={(e) => {
                setJours((j) => ({ ...j, au: e.target.value }));
                changer({});
              }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-slate-500">
            {donnees ? `${donnees.total} action${donnees.total > 1 ? "s" : ""} trouvée${donnees.total > 1 ? "s" : ""}` : "…"}
          </span>
          {filtresActifs && (
            <button
              onClick={reinitialiser}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {erreur && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{erreur}</span>
          </div>
          <button
            onClick={rafraichir}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Tableau */}
      <div className="table-responsive rounded-xl border border-[var(--border-color)]">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead className="bg-[var(--bg-input)] border-b border-[var(--border-color)]">
            <tr>
              <th className="p-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">Date</th>
              <th className="p-3 font-semibold text-[var(--text-primary)]">Auteur</th>
              <th className="p-3 font-semibold text-[var(--text-primary)]">Action</th>
              <th className="p-3 font-semibold text-[var(--text-primary)]">Description</th>
              <th className="p-3 font-semibold text-[var(--text-primary)]">Résultat</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {!donnees && chargement ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">Chargement du journal…</td>
              </tr>
            ) : donnees && donnees.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  {filtresActifs ? "Aucune action ne correspond à ces filtres." : "Aucune action enregistrée pour le moment."}
                </td>
              </tr>
            ) : (
              donnees?.items.map((log) => {
                const deplie = ouvert === log.id;
                const action = ACTIONS[log.action] ?? { label: log.action, badge: "badge-neutral" };
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className={`border-b border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-input)] transition-colors ${!log.succes ? "bg-red-50/40" : ""}`}
                      onClick={() => setOuvert(deplie ? null : log.id)}
                    >
                      <td className="p-3 whitespace-nowrap text-[var(--text-secondary)]">{formaterDate(log.createdAt)}</td>
                      <td className="p-3">
                        <div className="font-semibold text-[var(--text-primary)]">{log.userNom || log.userEmail || "Système"}</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          {log.userEmail && log.userNom ? `${log.userEmail} · ` : ""}
                          {libelleRole(log.userRole)}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`badge ${action.badge} font-semibold whitespace-nowrap`}>{action.label}</span>
                      </td>
                      <td className="p-3 text-[var(--text-primary)]">{decrire(log)}</td>
                      <td className="p-3 whitespace-nowrap">
                        {log.succes ? (
                          <span className="badge badge-success">Réussie</span>
                        ) : (
                          <span className="badge badge-danger">{log.statut === 403 ? "Refusée" : "Échec"} · {log.statut}</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <ChevronDown className={`w-4 h-4 text-slate-400 inline transition-transform ${deplie ? "rotate-180" : ""}`} />
                      </td>
                    </tr>
                    {deplie && (
                      <tr className="border-b border-[var(--border-color)] bg-[var(--bg-input)]">
                        <td colSpan={6} className="p-3 sm:p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <dl className="space-y-1.5">
                              {[
                                ["Requête", `${log.methode} /${log.route}`],
                                ["Ressource", `${libelleRessource(log.ressource)}${log.ressourceId ? ` · ${log.ressourceId}` : ""}`],
                                ["Adresse IP", log.ip || "—"],
                                ["Navigateur", log.userAgent || "—"],
                              ].map(([cle, valeur]) => (
                                <div key={cle} className="flex gap-2">
                                  <dt className="font-semibold text-[var(--text-secondary)] w-24 shrink-0">{cle}</dt>
                                  <dd className="text-[var(--text-primary)] break-all">{valeur}</dd>
                                </div>
                              ))}
                              {typeof log.details?.erreur === "string" && (
                                <div className="flex gap-2">
                                  <dt className="font-semibold text-red-600 w-24 shrink-0">Motif</dt>
                                  <dd className="text-red-700">{log.details.erreur}</dd>
                                </div>
                              )}
                            </dl>
                            <div>
                              <div className="font-semibold text-[var(--text-secondary)] mb-1">Données envoyées</div>
                              <pre className="text-[11px] leading-relaxed bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 max-h-64 overflow-auto whitespace-pre-wrap break-all">
                                {log.details ? JSON.stringify(log.details, null, 2) : "—"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {donnees && donnees.pages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs"
            disabled={page <= 1 || chargement}
            onClick={() => setFiltres((f) => ({ ...f, page: page - 1 }))}
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
          <span className="text-xs text-slate-500">Page {page} / {pages}</span>
          <button
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs"
            disabled={page >= pages || chargement}
            onClick={() => setFiltres((f) => ({ ...f, page: page + 1 }))}
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
