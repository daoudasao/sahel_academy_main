"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import InfoBanner from "@/app/components/InfoBanner";
import { formationsApi, departementsApi, uploadApi } from "@/app/lib/api";
import { useFormateurs } from "@/app/context/FormateursContext";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Plus,
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
  Percent,
} from "lucide-react";

export default function NouvelleFormationPage() {
  const router = useRouter();
  const { formateurs } = useFormateurs();
  const [departements, setDepartements] = useState<any[]>([]);

  const [form, setForm] = useState({
    titre: "",
    description: "",
    departementId: "",
    formateurId: "",
    prixInscription: "",
    prixMensualite: "",
    pourcentageFormateur: "30",
    dureeMois: "",
    niveau: "Débutant",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const depts = await departementsApi.list();
        setDepartements(depts || []);
      } catch (err) {
        console.error("Erreur chargement départements", err);
      }
    })();
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      let finalImageUrl: string | undefined = undefined;
      if (imageFile) {
        const { url } = await uploadApi(imageFile, "formations");
        finalImageUrl = url;
      }

      await formationsApi.create({
        titre: form.titre.trim(),
        description: form.description.trim() || undefined,
        departementId: form.departementId,
        formateurId: form.formateurId || undefined,
        prixInscription: Number(form.prixInscription) || 0,
        prixMensualite: Number(form.prixMensualite) || 0,
        pourcentageFormateur: Number(form.pourcentageFormateur) || 30,
        dureeMois: Number(form.dureeMois) || 1,
        niveau: form.niveau,
        estBourse: false,
        imageUrl: finalImageUrl,
      });
      setSaved(true);
      setTimeout(() => router.push("/dashboard/formations"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création de la formation");
    } finally {
      setSaving(false);
    }
  };

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
                <Sparkles className="w-3 h-3" />
                <span>Création de cours</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Nouvelle Formation
              </h1>
              <p className="text-xs text-emerald-100/75">
                Configurez le titre, les tarifs et le pôle académique.
              </p>
            </div>
          </div>
        </div>
      </div>

      <InfoBanner>
        <strong>Catalogue d'apprentissage :</strong> Renseignez les informations essentielles de la formation pour qu'elle devienne accessible aux étudiants sur la plateforme mobile.
      </InfoBanner>

      {/* Formulaire Pleine Largeur Responsive */}
      <form
        onSubmit={handleSubmit}
        className="w-full bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-xl p-5 sm:p-8 space-y-8 animate-in fade-in duration-300"
      >
        {/* Section 1 : Informations Principales */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Informations Principales
              </h2>
              <p className="text-xs text-slate-500">
                Intitulé officiel et objectifs du programme de formation
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
                Bannière affichée dans l&apos;application mobile. Formats conseillés : JPG/PNG, ratio paysage.
              </p>
              {previewUrl ? (
                <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Aperçu de la formation" className="w-full h-40 object-cover" />
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
                <label className="flex flex-col items-center justify-center gap-2 w-full max-w-sm h-40 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-emerald-400 text-slate-500 transition-colors cursor-pointer">
                  <ImageIcon className="w-6 h-6 text-emerald-600" />
                  <span className="text-xs font-semibold">Cliquez pour choisir une image</span>
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Section 2 : Attribution Académique et Pédagogique */}
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
            {/* Sélection Département */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Département <span className="text-red-500">*</span>
                </label>
                <Link
                  href="/dashboard/departements"
                  target="_blank"
                  className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  + Créer pôle
                </Link>
              </div>
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
              {departements.length === 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Aucun département.{" "}
                    <Link href="/dashboard/departements" className="underline font-bold">
                      Cliquez ici pour en créer un
                    </Link>
                  </span>
                </div>
              )}
            </div>

            {/* Sélection Formateur */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  Formateur Assigné
                </label>
                <Link
                  href="/dashboard/formateurs"
                  target="_blank"
                  className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Créer formateur
                </Link>
              </div>
              <select
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all"
                value={form.formateurId}
                onChange={(e) => handleChange("formateurId", e.target.value)}
              >
                <option value="">— Aucun formateur pour l'instant —</option>
                {formateurs
                  .filter((f) => f.actif)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nom} {f.specialite ? `(${f.specialite})` : ""}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3 : Tarifs, Durée et Niveau */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Tarification & Modalités
              </h2>
              <p className="text-xs text-slate-500">
                Frais d'inscription, coût mensuel, durée et niveau requis
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Inscription (FCFA) <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all"
                type="number"
                placeholder="10000"
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
                placeholder="15000"
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
                placeholder="30"
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
                <Clock className="w-4 h-4 text-emerald-600" />
                Durée (Mois) <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26] transition-all"
                type="number"
                placeholder="4"
                value={form.dureeMois}
                onChange={(e) => handleChange("dureeMois", e.target.value)}
                required
                min="1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
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

        {/* Retours d'erreur ou succès */}
        {error && (
          <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-red-700 text-sm font-semibold flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {saved && (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>Formation créée avec succès ! Redirection en cours...</span>
          </div>
        )}

        {/* Boutons d'action bas de page (Full Width responsive) */}
        <div className="flex flex-col-reverse sm:flex-row justify-end items-center gap-3 pt-6 border-t border-slate-100">
          <Link
            href="/dashboard/formations"
            className="w-full sm:w-auto h-12 px-6 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving || !form.titre || !form.departementId}
            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-sm transition-all shadow-lg hover:shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                <span>Création en cours...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Créer la formation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
