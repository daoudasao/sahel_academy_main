"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import InfoBanner from "@/app/components/InfoBanner";
import { formationsApi, departementsApi, uploadApi } from "@/app/lib/api";
import { useFormateurs } from "@/app/context/FormateursContext";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderPlus,
  UserPlus,
  DollarSign,
  Clock,
  GraduationCap,
  Layers,
  FileText,
  ImageIcon,
  X,
  Edit3,
  Percent,
} from "lucide-react";

export default function ModifierFormationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { formateurs } = useFormateurs();
  const [departements, setDepartements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [titreFormation, setTitreFormation] = useState("");

  const [form, setForm] = useState({
    titre: "",
    description: "",
    departementId: "",
    formateurId: "",
    prixInscription: "",
    prixMensualite: "",
    pourcentageFormateur: "70",
    dureeMois: "1",
    niveau: "Débutant",
  });
  const [imageUrl, setImageUrl] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [f, depts] = await Promise.all([formationsApi.get(id), departementsApi.list()]);
        setDepartements(depts || []);
        setTitreFormation(f.titre);
        setForm({
          titre: f.titre ?? "",
          description: f.description ?? "",
          departementId: f.departementId ?? "",
          formateurId: f.formateurId ?? f.formateur?.id ?? "",
          prixInscription: String(f.prixInscription ?? ""),
          prixMensualite: String(f.prixMensualite ?? ""),
          pourcentageFormateur: String(f.pourcentageFormateur ?? "30"),
          dureeMois: String(f.dureeMois ?? "1"),
          niveau: f.niveau ?? "Débutant",
        });
        setImageUrl(f.imageUrl ?? "");
        setPreviewUrl(f.imageUrl ?? "");
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setNewImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    setNewImageFile(null);
    setPreviewUrl("");
    setImageUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      let finalImageUrl: string | undefined = imageUrl || undefined;
      if (newImageFile) {
        const { url } = await uploadApi(newImageFile, "formations");
        finalImageUrl = url;
      }

      await formationsApi.update(id, {
        titre: form.titre.trim(),
        description: form.description.trim() || undefined,
        departementId: form.departementId,
        formateurId: form.formateurId || undefined,
        prixInscription: Number(form.prixInscription) || 0,
        prixMensualite: Number(form.prixMensualite) || 0,
        pourcentageFormateur: Number(form.pourcentageFormateur) || 30,
        dureeMois: Number(form.dureeMois) || 1,
        niveau: form.niveau,
        imageUrl: finalImageUrl,
      });
      setSaved(true);
      setTimeout(() => router.push("/dashboard/formations"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0a2d26]" />
        <p className="text-sm font-medium text-slate-500">Chargement de la formation…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="w-full space-y-4">
        <div className="w-full bg-[#0a2d26] rounded-2xl p-6 text-white shadow-md">
          <h1 className="text-xl font-bold">Formation introuvable</h1>
        </div>
        <InfoBanner>
          <strong>Information :</strong> Aucune formation ne correspond à l&apos;identifiant demandé.
        </InfoBanner>
        <div className="w-full text-center py-16 bg-white border border-slate-200 rounded-3xl p-6">
          <p className="text-slate-600 mb-4 font-medium">La formation spécifiée n&apos;existe pas ou a été supprimée.</p>
          <Link
            href="/dashboard/formations"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a2d26] text-white text-sm font-semibold hover:bg-[#0d3b32] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste des formations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Compact Green Header */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/formations"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all border border-white/15 shrink-0"
              title="Retour aux formations"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
                <Edit3 className="w-3 h-3" />
                <span>Modification de cours</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Modifier : {titreFormation}
              </h1>
              <p className="text-xs text-emerald-100/75">
                Mettez à jour les détails, visuels et attributions académiques.
              </p>
            </div>
          </div>
        </div>
      </div>

      <InfoBanner>
        <strong>Catalogue d'apprentissage :</strong> Les modifications apportées seront immédiatement synchronisées pour l'ensemble des étudiants.
      </InfoBanner>

      {/* Formulaire Pleine Largeur Responsive */}
      <form
        onSubmit={handleSubmit}
        className="w-full bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-xl p-5 sm:p-8 space-y-8 animate-in fade-in duration-300"
      >
        {/* Section 1 : Informations Principales & Visuel */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Informations Principales & Visuel
              </h2>
              <p className="text-xs text-slate-500">
                Intitulé officiel, image de présentation et objectifs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Titre de la formation <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all"
                type="text"
                placeholder="ex: Développeur Fullstack React & Node.js"
                value={form.titre}
                onChange={(e) => handleChange("titre", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Description complète <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all resize-y"
                placeholder="Décrivez les compétences visées, le programme détaillé et les débouchés professionnels..."
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                Image de la formation
              </label>
              <p className="text-xs text-slate-500">
                Bannière affichée dans l&apos;application mobile.
              </p>
              {previewUrl ? (
                <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Aperçu de la formation" className="w-full h-44 object-cover" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-colors"
                    title="Retirer l'image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 w-full max-w-md h-40 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-emerald-400 text-slate-500 transition-colors cursor-pointer">
                  <ImageIcon className="w-6 h-6 text-emerald-600" />
                  <span className="text-xs font-semibold">Cliquez pour choisir une nouvelle image</span>
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Section 2 : Attribution Académique */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Attribution Académique
              </h2>
              <p className="text-xs text-slate-500">
                Rattachement au pôle d'enseignement et au formateur responsable
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                Département <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all"
                value={form.departementId}
                onChange={(e) => handleChange("departementId", e.target.value)}
                required
              >
                <option value="">— Sélectionner un département —</option>
                {departements.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Formateur Responsable
              </label>
              <select
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all"
                value={form.formateurId}
                onChange={(e) => handleChange("formateurId", e.target.value)}
              >
                <option value="">— Sélectionner un formateur —</option>
                {formateurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom} {f.specialite ? `(${f.specialite})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3 : Tarification & Durée */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Tarification & Durée
              </h2>
              <p className="text-xs text-slate-500">
                Montants d'inscription, mensualités et niveau d'étude
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-600" />
                Inscription (FCFA) <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all"
                type="number"
                value={form.prixInscription}
                onChange={(e) => handleChange("prixInscription", e.target.value)}
                required
                min="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Mensualité (FCFA) <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all"
                type="number"
                value={form.prixMensualite}
                onChange={(e) => handleChange("prixMensualite", e.target.value)}
                required
                min="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-emerald-600" />
                Part Formateur (%) <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all"
                type="number"
                value={form.pourcentageFormateur}
                onChange={(e) => handleChange("pourcentageFormateur", e.target.value)}
                required
                min="0"
                max="100"
              />
              <p className="text-[11px] text-slate-500 font-medium">
                Part Centre : {100 - (Number(form.pourcentageFormateur) || 30)}%
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Durée (Mois) <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all"
                type="number"
                value={form.dureeMois}
                onChange={(e) => handleChange("dureeMois", e.target.value)}
                required
                min="1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Niveau <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all"
                value={form.niveau}
                onChange={(e) => handleChange("niveau", e.target.value)}
                required
              >
                <option value="Débutant">Débutant</option>
                <option value="Intermédiaire">Intermédiaire</option>
                <option value="Avancé">Avancé</option>
              </select>
            </div>
          </div>
        </div>

        {/* Messaging Feedback */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {saved && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Formation modifiée avec succès ! Redirection en cours...</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link
            href="/dashboard/formations"
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors text-center"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Enregistrement en cours…</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Enregistrer les modifications</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
