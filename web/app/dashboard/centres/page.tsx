"use client";

import { useState, useEffect } from "react";
import { formatCreneau } from "@/app/lib/mock-data";
import { centresApi } from "@/app/lib/api";
import SelecteurPosition from "./SelecteurPosition";
import {
  MapPin,
  Phone,
  Plus,
  Trash2,
  Edit2,
  Building2,
  X,
  Search,
  Navigation,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";

const formVide = { nom: "", ville: "", adresse: "", telephone: "", coordonnees: "", lienMaps: "" };

/**
 * Lit « 12.6392, -8.0029 » (copié depuis Google Maps : clic droit sur le
 * lieu → coordonnées). Renvoie null si le champ est vide, "invalide" sinon.
 */
function lireCoordonnees(texte: string): { latitude: number; longitude: number } | null | "invalide" {
  const t = texte.trim();
  if (!t) return null;
  const m = t.match(/^(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!m) return "invalide";
  const latitude = parseFloat(m[1].replace(",", "."));
  const longitude = parseFloat(m[2].replace(",", "."));
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return "invalide";
  return { latitude, longitude };
}

/** Lien carte d'un centre : lien saisi, sinon coordonnées GPS. */
function lienCarte(c: Centre): string | null {
  if (c.lienMaps) return c.lienMaps;
  if (c.latitude != null && c.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`;
  }
  return null;
}

// Ponctuel (dateHeure) ou hebdomadaire (jourSemaine 1 = lundi … 7 = dimanche + heure "HH:mm")
interface Creneau {
  id: string;
  dateHeure?: string | null;
  jourSemaine?: number | null;
  heure?: string | null;
  heureFin?: string | null;
}

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const h = (x: string) => x.replace(":", "h");

function libelleCreneau(cr: Creneau): string {
  if (cr.jourSemaine && cr.heure) {
    const jour = JOURS[cr.jourSemaine - 1];
    return cr.heureFin ? `${jour} · de ${h(cr.heure)} à ${h(cr.heureFin)}` : `${jour} · ${h(cr.heure)}`;
  }
  return cr.dateHeure ? formatCreneau(cr.dateHeure) : "—";
}

/** Clé de tri : hebdomadaires (lundi → dimanche, par heure), puis datés. */
function cleCreneau(cr: Creneau): string {
  if (cr.jourSemaine && cr.heure) return `0-${cr.jourSemaine}-${cr.heure}`;
  return `1-${cr.dateHeure ?? ""}`;
}

type SaisieCreneau = { jours: number[]; debut: string; fin: string };
const SAISIE_VIDE: SaisieCreneau = { jours: [], debut: "09:00", fin: "17:00" };

interface Centre {
  id: string;
  nom: string;
  ville: string;
  adresse?: string;
  telephone?: string;
  latitude?: number | null;
  longitude?: number | null;
  lienMaps?: string | null;
  creneaux: Creneau[];
}

export default function CentresPage() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Formulaire & Modal Édition / Création
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(formVide);
  const [submitting, setSubmitting] = useState(false);
  const [erreurForm, setErreurForm] = useState<string | null>(null);

  // Modal Suppression
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  // Input créneau par centre
  const [newSlotMap, setNewSlotMap] = useState<Record<string, SaisieCreneau>>({});
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [slotCentre, setSlotCentre] = useState<Centre | null>(null);
  const saisieDe = (id: string) => newSlotMap[id] ?? SAISIE_VIDE;
  const majSaisie = (id: string, maj: Partial<SaisieCreneau>) =>
    setNewSlotMap((prev) => ({ ...prev, [id]: { ...(prev[id] ?? SAISIE_VIDE), ...maj } }));
  const saisieValide = (x: SaisieCreneau) => x.jours.length > 0 && !!x.debut && !!x.fin && x.fin > x.debut;

  useEffect(() => {
    (async () => {
      try {
        setCentres(await centresApi.list({ gestion: true }));
      } catch (err) {
        console.error("Erreur lors du chargement des centres:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openNew = () => {
    setEditId(null);
    setForm(formVide);
    setErreurForm(null);
    setModalOpen(true);
  };

  const openEdit = (c: Centre) => {
    setEditId(c.id);
    setForm({
      nom: c.nom,
      ville: c.ville,
      adresse: c.adresse || "",
      telephone: c.telephone || "",
      coordonnees:
        c.latitude != null && c.longitude != null ? `${c.latitude}, ${c.longitude}` : "",
      lienMaps: c.lienMaps || "",
    });
    setErreurForm(null);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.nom.trim() || submitting) return;
    const gps = lireCoordonnees(form.coordonnees);
    if (gps === "invalide") {
      setErreurForm("Coordonnées GPS invalides. Format attendu : 12.6392, -8.0029");
      return;
    }
    const lienMaps = form.lienMaps.trim();
    if (lienMaps && !/^https?:\/\//i.test(lienMaps)) {
      setErreurForm("Le lien Google Maps doit commencer par https://");
      return;
    }
    setErreurForm(null);
    setSubmitting(true);
    try {
      // Champs de localisation vides : null pour effacer la valeur enregistrée.
      const payload = {
        nom: form.nom.trim(),
        ville: form.ville,
        adresse: form.adresse || undefined,
        telephone: form.telephone || undefined,
        latitude: gps?.latitude ?? null,
        longitude: gps?.longitude ?? null,
        lienMaps: lienMaps || null,
      };
      if (editId) {
        const updated = await centresApi.update(editId, payload);
        setCentres((cs) => cs.map((c) => (c.id === editId ? { ...c, ...updated } : c)));
      } else {
        const created = await centresApi.create(payload);
        setCentres((cs) => [...cs, { ...created, creneaux: created.creneaux ?? [] }]);
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du centre:", err);
      setErreurForm(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSubmitting(false);
    }
  };

  const del = async () => {
    if (!deletingId || submitting) return;
    setSubmitting(true);
    try {
      await centresApi.remove(deletingId);
      setCentres((cs) => cs.filter((c) => c.id !== deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error("Erreur lors de la suppression du centre:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const addSlot = async (centreId: string) => {
    const saisie = saisieDe(centreId);
    if (!saisieValide(saisie) || ajoutEnCours) return;
    setAjoutEnCours(true);
    try {
      // Un créneau par jour coché (le serveur ignore les doublons).
      // Une plage par jour coché (le serveur ignore les doublons).
      const crees: Creneau[] = await Promise.all(
        saisie.jours.map((jourSemaine) =>
          centresApi.addCreneau(centreId, { jourSemaine, heure: saisie.debut, heureFin: saisie.fin })
        )
      );
      setCentres((cs) =>
        cs.map((c) => {
          if (c.id !== centreId) return c;
          const nouveaux = crees.filter((n) => !c.creneaux.some((x) => x.id === n.id));
          return { ...c, creneaux: [...c.creneaux, ...nouveaux] };
        })
      );
      setNewSlotMap((prev) => ({ ...prev, [centreId]: { ...SAISIE_VIDE, debut: saisie.debut, fin: saisie.fin } }));
      setSlotCentre(null);
    } catch (err) {
      console.error("Erreur lors de l'ajout du créneau:", err);
    } finally {
      setAjoutEnCours(false);
    }
  };

  const removeSlot = async (centreId: string, creneauId: string) => {
    try {
      await centresApi.removeCreneau(centreId, creneauId);
      setCentres((cs) =>
        cs.map((c) =>
          c.id !== centreId ? c : { ...c, creneaux: c.creneaux.filter((x) => x.id !== creneauId) }
        )
      );
    } catch (err) {
      console.error("Erreur suppression créneau:", err);
    }
  };

  const filtered = centres.filter(
    (c) =>
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      c.ville.toLowerCase().includes(search.toLowerCase()) ||
      (c.adresse || "").toLowerCase().includes(search.toLowerCase())
  );


  // Styles communs : variables du thème (clair / sombre) pour rester lisible partout.
  const carte = "bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl";
  const texte = "text-[var(--text-primary)]";
  const texteDoux = "text-[var(--text-secondary)]";
  const btnPrincipal =
    "inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--bg-card)] text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const btnSecondaire =
    "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-sidebar-hover)] text-sm font-medium transition cursor-pointer";
  const pastille =
    "inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-sm text-[var(--text-primary)]";

  const saisie = slotCentre ? saisieDe(slotCentre.id) : SAISIE_VIDE;
  const resume =
    saisieValide(saisie)
      ? `Chaque ${saisie.jours.map((j) => JOURS[j - 1].toLowerCase()).join(", ")}, de ${h(saisie.debut)} à ${h(saisie.fin)}. Les candidats choisiront une heure dans cette plage.`
      : null;
  const finAvantDebut = !!saisie.debut && !!saisie.fin && saisie.fin <= saisie.debut;

  return (
    <div className="w-full max-w-4xl space-y-5">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${texte}`}>Centres</h1>
          <p className={`text-sm mt-1 ${texteDoux}`}>
            Les lieux où les candidats prennent rendez-vous depuis l&apos;application, et leurs horaires.
          </p>
        </div>
        <button onClick={openNew} className={btnPrincipal}>
          <Plus className="w-4 h-4" />
          Nouveau centre
        </button>
      </div>

      {centres.length > 3 && (
        <div className="relative">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${texteDoux}`} />
          <input
            type="text"
            placeholder="Rechercher un centre…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={`${carte} text-center py-14 px-6`}>
          <Building2 className={`w-10 h-10 mx-auto mb-3 ${texteDoux}`} />
          <p className={`font-semibold ${texte}`}>
            {loading ? "Chargement…" : centres.length ? "Aucun centre ne correspond" : "Aucun centre pour l'instant"}
          </p>
          {!loading && centres.length === 0 && (
            <p className={`text-sm mt-1 ${texteDoux}`}>Ajoutez votre premier centre pour ouvrir les rendez-vous.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => {
            const creneaux = [...c.creneaux].sort((a, b) => (cleCreneau(a) < cleCreneau(b) ? -1 : 1));
            const hebdo = creneaux.filter((cr) => cr.jourSemaine && cr.heure);
            const dates = creneaux.filter((cr) => !(cr.jourSemaine && cr.heure));
            const lien = lienCarte(c);

            return (
              <section key={c.id} className={`${carte} p-5`}>
                {/* Infos du centre */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className={`text-lg font-bold ${texte}`}>{c.nom}</h2>
                    <div className={`mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${texteDoux}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 shrink-0" />
                        {[c.ville, c.adresse].filter(Boolean).join(" · ") || "Adresse non renseignée"}
                      </span>
                      {c.telephone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="w-4 h-4 shrink-0" />
                          {c.telephone}
                        </span>
                      )}
                      {lien ? (
                        <a
                          href={lien}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-sidebar-active)] hover:underline"
                        >
                          <Navigation className="w-4 h-4 shrink-0" />
                          Voir sur la carte
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[var(--accent-warning,#d97706)]">
                          <Navigation className="w-4 h-4 shrink-0" />
                          Position non renseignée
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEdit(c)} className={btnSecondaire}>
                      <Edit2 className="w-4 h-4" />
                      Modifier
                    </button>
                    <button
                      onClick={() => {
                        setDeletingId(c.id);
                        setDeletingName(c.nom);
                      }}
                      className={`${btnSecondaire} !text-[var(--accent-danger)]`}
                      title="Supprimer ce centre"
                      aria-label="Supprimer ce centre"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Horaires de rendez-vous */}
                <div className="mt-5 pt-4 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className={`font-semibold ${texte}`}>
                      Disponibilités
                      <span className={`ml-2 text-sm font-normal ${texteDoux}`}>({creneaux.length})</span>
                    </h3>
                    <button onClick={() => setSlotCentre(c)} className={btnSecondaire}>
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  </div>

                  {creneaux.length === 0 ? (
                    <p className={`text-sm ${texteDoux}`}>
                      Aucune disponibilité : les candidats ne peuvent pas encore réserver dans ce centre.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {[
                        ["Chaque semaine", hebdo],
                        ["Anciennes dates (à retirer)", dates],
                      ].map(([titre, liste]) =>
                        (liste as Creneau[]).length === 0 ? null : (
                          <div key={titre as string}>
                            <p className={`text-xs font-medium mb-1.5 ${texteDoux}`}>{titre as string}</p>
                            <div className="flex flex-wrap gap-2">
                              {(liste as Creneau[]).map((cr) => (
                                <span key={cr.id} className={pastille}>
                                  {libelleCreneau(cr)}
                                  <button
                                    onClick={() => removeSlot(c.id, cr.id)}
                                    className={`p-1 rounded-lg ${texteDoux} hover:text-[var(--accent-danger)] hover:bg-[var(--bg-sidebar-hover)] transition cursor-pointer`}
                                    title="Retirer"
                                    aria-label="Retirer cette disponibilité"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Ajout d'un horaire */}
      <Dialog open={!!slotCentre} onOpenChange={(open) => !open && setSlotCentre(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className={`text-lg font-bold ${texte}`}>Ajouter une disponibilité</DialogTitle>
            <DialogDescription className={`text-sm ${texteDoux}`}>{slotCentre?.nom}</DialogDescription>
          </DialogHeader>

          {slotCentre && (
            <div className="space-y-5 py-1">
              <div>
                <p className={`text-sm font-medium mb-2 ${texte}`}>Quels jours ?</p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {JOURS.map((nom, i) => {
                    const jour = i + 1;
                    const actif = saisie.jours.includes(jour);
                    return (
                      <button
                        key={jour}
                        type="button"
                        aria-pressed={actif}
                        onClick={() =>
                          majSaisie(slotCentre.id, {
                            jours: actif ? saisie.jours.filter((x) => x !== jour) : [...saisie.jours, jour].sort(),
                          })
                        }
                        className={`py-2 rounded-lg border text-sm font-semibold transition cursor-pointer ${
                          actif
                            ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--bg-card)]"
                            : `border-[var(--border-color)] ${texte} hover:bg-[var(--bg-sidebar-hover)]`
                        }`}
                      >
                        {nom.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className={`text-sm font-medium mb-2 ${texte}`}>Disponible</p>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${texteDoux}`}>de</span>
                  <input
                    type="time"
                    aria-label="Heure de début"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                    value={saisie.debut}
                    onChange={(e) => majSaisie(slotCentre.id, { debut: e.target.value })}
                  />
                  <span className={`text-sm ${texteDoux}`}>à</span>
                  <input
                    type="time"
                    aria-label="Heure de fin"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                    value={saisie.fin}
                    onChange={(e) => majSaisie(slotCentre.id, { fin: e.target.value })}
                  />
                </div>
                {finAvantDebut && (
                  <p className="text-xs mt-1.5 text-[var(--accent-danger)]">L&apos;heure de fin doit être après l&apos;heure de début.</p>
                )}
              </div>

              {resume && (
                <p className="text-sm px-3 py-2 rounded-xl bg-[var(--bg-sidebar-active)] text-[var(--text-sidebar-active)] font-medium">
                  {resume}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
            <button className={btnSecondaire} onClick={() => setSlotCentre(null)} disabled={ajoutEnCours}>
              Annuler
            </button>
            <button
              className={btnPrincipal}
              onClick={() => slotCentre && addSlot(slotCentre.id)}
              disabled={!saisieValide(saisie) || ajoutEnCours}
            >
              {ajoutEnCours ? "Ajout…" : "Ajouter"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Création / Modification Centre */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0a2d26] text-lg font-bold">
              <Building2 className="w-5 h-5 text-emerald-600" />
              {editId ? "Modifier le centre" : "Nouveau centre physique"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-600">
              Renseignez les coordonnées d&apos;implantation du centre d&apos;examen ou de visite.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nom du centre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                placeholder="Ex: Centre Principal Bamako"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Ville
              </label>
              <input
                type="text"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                placeholder="Ex: Bamako"
                value={form.ville}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Adresse physique
              </label>
              <input
                type="text"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                placeholder="Ex: ACI 2000, Rue 300"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Téléphone de contact
              </label>
              <input
                type="text"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                placeholder="Ex: +223 20 00 00 01"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              />
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Position sur la carte
              </label>
              {modalOpen && (
                <SelecteurPosition
                  valeur={(() => {
                    const gps = lireCoordonnees(form.coordonnees);
                    return gps && gps !== "invalide" ? gps : null;
                  })()}
                  onChange={(p) =>
                    setForm((f) => ({ ...f, coordonnees: `${p.latitude}, ${p.longitude}` }))
                  }
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Coordonnées GPS (latitude, longitude)
              </label>
              <input
                type="text"
                inputMode="decimal"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                placeholder="Ex: 12.6392, -8.0029"
                value={form.coordonnees}
                onChange={(e) => setForm({ ...form, coordonnees: e.target.value })}
              />
              <p className="text-[11px] text-slate-500">
                Remplies automatiquement par la carte. Vous pouvez aussi les coller depuis Google Maps.
                Elles permettent à l&apos;application d&apos;ouvrir l&apos;itinéraire.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Lien Google Maps (facultatif)
              </label>
              <input
                type="url"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
                placeholder="Ex: https://maps.app.goo.gl/…"
                value={form.lienMaps}
                onChange={(e) => setForm({ ...form, lienMaps: e.target.value })}
              />
            </div>

            {erreurForm && (
              <div className="p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                {erreurForm}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2 border-t mt-3">
            <button
              className="w-full sm:w-auto h-10 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              onClick={save}
              disabled={!form.nom.trim() || submitting}
            >
              {submitting ? "Enregistrement..." : editId ? "Enregistrer les modifications" : "Créer le centre"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Suppression */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 text-lg font-bold">
              <Trash2 className="w-5 h-5" />
              Supprimer le centre
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-slate-600 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer le centre <strong>&ldquo;{deletingName}&rdquo;</strong> ?<br />
              <span className="text-red-600 text-xs mt-2 block font-medium">
                Le centre et ses créneaux seront envoyés dans la Corbeille ; vous pourrez les restaurer à tout moment.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2 border-t mt-3">
            <button
              className="w-full sm:w-auto h-10 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              onClick={() => setDeletingId(null)}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              onClick={del}
              disabled={submitting}
            >
              {submitting ? "Suppression..." : "Oui, supprimer le centre"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
