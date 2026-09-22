"use client";

import InfoBanner from "@/app/components/InfoBanner";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type ChampFormulaire, type TypeChamp } from "@/app/lib/mock-data";
import { boursesApi, departementsApi, uploadApi } from "@/app/lib/api";

const typeLabels: Record<TypeChamp, string> = {
  texte: "Texte court",
  paragraphe: "Paragraphe",
  email: "Email",
  telephone: "Téléphone",
  nombre: "Nombre",
  choix: "Choix multiple",
  lien: "Lien informatif",
};

const typeIcons: Record<TypeChamp, React.ReactNode> = {
  texte: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3" /><line x1="12" y1="4" x2="12" y2="20" /><line x1="8" y1="20" x2="16" y2="20" /></svg>,
  paragraphe: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>,
  email: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  telephone: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  nombre: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>,
  choix: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  lien: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
};

let nextId = 1;
function genId() {
  return `new_${nextId++}`;
}

export default function NouvelleboursePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    titre: "",
    description: "",
    formationId: "",
    departementId: "",
    dateLimite: "",
  });
  const [departements, setDepartements] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Admission Document & Message Template
  const [documentAdmissionUrl, setDocumentAdmissionUrl] = useState("");
  const [documentAdmissionNom, setDocumentAdmissionNom] = useState("");
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [messageAdmission, setMessageAdmission] = useState("");

  useEffect(() => {
    departementsApi.list().then((depts) => setDepartements(depts || [])).catch(() => {});
  }, []);

  const [champs, setChamps] = useState<ChampFormulaire[]>([
    { id: genId(), label: "Nom complet", type: "texte", obligatoire: true, options: [], cle: "nom" },
    { id: genId(), label: "Email", type: "email", obligatoire: true, options: [], cle: "email" },
    { id: genId(), label: "Téléphone", type: "telephone", obligatoire: true, options: [] },
  ]);

  const [showAddField, setShowAddField] = useState(false);
  const [saved, setSaved] = useState(false);
  const [createdBourse, setCreatedBourse] = useState<any>(null);

  const handleFormChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingImage(true);
    try {
      const { url } = await uploadApi(file, "bourses");
      setImageUrl(url);
    } catch {
      setError("Erreur lors de l'upload de l'image");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingDocument(true);
    try {
      const { url } = await uploadApi(file, "documents");
      setDocumentAdmissionUrl(url);
      setDocumentAdmissionNom(file.name);
    } catch {
      setError("Erreur lors de l'upload du document d'admission");
    } finally {
      setUploadingDocument(false);
      e.target.value = "";
    }
  };

  const insertVariable = (varName: string) => {
    setMessageAdmission((prev) => prev + ` {${varName}}`);
  };

  const addChamp = (type: TypeChamp) => {
    const newChamp: ChampFormulaire = {
      id: genId(),
      label: type === "lien" ? "Consulter la documentation" : "",
      type,
      obligatoire: type === "lien" ? false : true,
      options: type === "choix" ? ["Option 1", "Option 2"] : type === "lien" ? ["https://"] : [],
    };
    setChamps((prev) => [...prev, newChamp]);
    setShowAddField(false);
  };

  const updateChamp = (id: string, updates: Partial<ChampFormulaire>) => {
    setChamps((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeChamp = (id: string) => {
    setChamps((prev) => prev.filter((c) => c.id !== id));
  };

  const moveChamp = (index: number, direction: "up" | "down") => {
    const newChamps = [...champs];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newChamps.length) return;
    [newChamps[index], newChamps[target]] = [newChamps[target], newChamps[index]];
    setChamps(newChamps);
  };

  const addOption = (champId: string) => {
    const champ = champs.find((c) => c.id === champId);
    if (!champ) return;
    updateChamp(champId, { options: [...champ.options, `Option ${champ.options.length + 1}`] });
  };

  const updateOption = (champId: string, optIndex: number, value: string) => {
    const champ = champs.find((c) => c.id === champId);
    if (!champ) return;
    const newOptions = [...champ.options];
    newOptions[optIndex] = value;
    updateChamp(champId, { options: newOptions });
  };

  const removeOption = (champId: string, optIndex: number) => {
    const champ = champs.find((c) => c.id === champId);
    if (!champ) return;
    updateChamp(champId, { options: champ.options.filter((_, i) => i !== optIndex) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await boursesApi.create({
        titre: form.titre,
        description: form.description || undefined,
        imageUrl: imageUrl || undefined,
        documentAdmissionUrl: documentAdmissionUrl || undefined,
        documentAdmissionNom: documentAdmissionNom || undefined,
        messageAdmission: messageAdmission || undefined,
        formationId: form.formationId || undefined,
        departementId: form.departementId || undefined,
        datePublication: new Date().toISOString(),
        dateLimite: new Date(form.dateLimite).toISOString(),
        statut: "en_attente",
        champs: champs.map((c, i) => ({
          label: c.label,
          type: c.type,
          obligatoire: c.obligatoire,
          options: c.options,
          aide: c.aide,
          cle: c.cle,
          ordre: i,
        })),
      });
      setCreatedBourse(res);
      setSaved(true);
      if (res?.id) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const verifBaseUrl = (process.env.NEXT_PUBLIC_VERIF_URL || origin).replace(/\/$/, "");
        const url = verifBaseUrl ? `${verifBaseUrl}/bourses/${res.id}` : `/bourses/${res.id}`;
        navigator.clipboard.writeText(url);
      }
      setTimeout(() => router.push("/dashboard/bourses"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
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
              href="/dashboard/bourses"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all border border-white/15 shrink-0 text-xs"
            >
              ←
            </Link>
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
                <span>Création d'Aide Financière</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Nouvelle Bourse d'Études
              </h1>
              <p className="text-xs text-emerald-100/75">
                Créez une offre de bourse et personnalisez les champs du formulaire.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <InfoBanner>
          <strong>Statut de création :</strong> La bourse sera enregistrée avec le statut <em>"En attente"</em>.<br />
          <strong>Validation :</strong> L&apos;administrateur devra ensuite la <strong>confirmer</strong> depuis la liste des bourses pour l&apos;ouvrir officiellement aux candidats.
        </InfoBanner>
        <form onSubmit={handleSubmit}>
          {/* Bourse Info */}
          <div className="card animate-in" style={{ padding: 28, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 8 }}>
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
              Informations de la bourse
            </h3>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Titre de la bourse <span className="required">*</span></label>
                <input className="form-input" type="text" placeholder="ex: Bourse Python & Data" value={form.titre} onChange={(e) => handleFormChange("titre", e.target.value)} required />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Décrivez la bourse et ses avantages..." value={form.description} onChange={(e) => handleFormChange("description", e.target.value)} />
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Image de la bourse</label>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px" }}>
                  Bannière affichée dans l&apos;application mobile.
                </p>
                {imageUrl ? (
                  <div style={{ position: "relative", width: "100%", maxWidth: 360, overflow: "hidden", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Aperçu de la bourse" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 8, border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", fontWeight: 700 }}
                      title="Retirer l'image"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                      width: "100%", maxWidth: 360, height: 160, borderRadius: "var(--radius-md)",
                      border: "2px dashed var(--border)", background: "var(--bg-muted, #f8fafc)",
                      color: "var(--text-muted)", cursor: uploadingImage ? "default" : "pointer", fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {uploadingImage ? "Téléversement en cours…" : "🖼️ Cliquez pour choisir une image"}
                    <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} disabled={uploadingImage} />
                  </label>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Département / Catégorie</label>
                <select
                  className="form-select"
                  value={form.departementId}
                  onChange={(e) => handleFormChange("departementId", e.target.value)}
                >
                  <option value="">-- Sélectionner un département (optionnel) --</option>
                  {departements.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date limite de candidature <span className="required">*</span></label>
                <input className="form-input" type="date" value={form.dateLimite} onChange={(e) => handleFormChange("dateLimite", e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Document & Message d'admission pour les admis */}
          <div className="card animate-in" style={{ padding: 28, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 8 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M16 13H8" /><path d="M16 17H8" />
              </svg>
              Document & Message d'admission (pour les candidats admis)
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px" }}>
              Ces éléments seront automatiquement envoyés aux candidats retenus à cette bourse d&apos;études lors de la validation de leur admission.
            </p>

            <div className="form-grid">
              {/* Document upload */}
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Document joint d&apos;admission (ex: Attestation, Lettre, Règlement...)</label>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px" }}>
                  Ce fichier (PDF, DOC, Image) sera téléchargeable par les candidats admis dans l&apos;application.
                </p>
                {documentAdmissionUrl ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "rgba(16,185,129,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                      <span style={{ fontSize: 20 }}>📄</span>
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {documentAdmissionNom || "Document_admission.pdf"}
                        </div>
                        <a href={documentAdmissionUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--accent-primary)", textDecoration: "underline" }}>
                          Voir / Télécharger
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setDocumentAdmissionUrl(""); setDocumentAdmissionNom(""); }}
                      className="btn btn-ghost btn-sm"
                      style={{ color: "#dc2626" }}
                    >
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      width: "100%", height: 50, borderRadius: "var(--radius-md)",
                      border: "2px dashed var(--border)", background: "var(--bg-muted, #f8fafc)",
                      color: "var(--text-muted)", cursor: uploadingDocument ? "default" : "pointer", fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {uploadingDocument ? "Téléversement du fichier en cours…" : "📎 Joindre un document d'admission (PDF, DOCX, Image...)"}
                    <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={handleDocumentUpload} style={{ display: "none" }} disabled={uploadingDocument} />
                  </label>
                )}
              </div>

              {/* Message d'admission personnalisable */}
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Message d&apos;admission personnalisé</label>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px" }}>
                  Rédigez le texte envoyé à l&apos;étudiant. Utilisez les variables ci-dessous pour insérer dynamiquement le nom ou l&apos;email du candidat.
                </p>

                {/* Variable Chip Buttons */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", alignSelf: "center", marginRight: 4 }}>Variables :</span>
                  {[
                    { tag: "nom", label: "{nom}" },
                    { tag: "prenom", label: "{prenom}" },
                    { tag: "email", label: "{email}" },
                    { tag: "bourse", label: "{bourse}" },
                    { tag: "date", label: "{date}" },
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => insertVariable(v.tag)}
                      style={{
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 14,
                        border: "1px solid var(--accent-primary)",
                        background: "rgba(20,184,166,0.1)",
                        color: "var(--accent-primary)",
                        cursor: "pointer",
                      }}
                      title={`Insérer la variable ${v.label}`}
                    >
                      + {v.label}
                    </button>
                  ))}
                </div>

                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="ex: Félicitations {nom} ! Votre candidature à la bourse {bourse} a été retenue avec succès. Veuillez consulter le document ci-joint pour la suite."
                  value={messageAdmission}
                  onChange={(e) => setMessageAdmission(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Form Builder */}
          <div className="card animate-in" style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 8 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                Formulaire de candidature
              </h3>
              <span className="badge badge-info">{champs.length} champ{champs.length > 1 ? "s" : ""}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {champs.map((champ, index) => (
                <div key={champ.id} className="form-builder-field">
                  {/* Field header */}
                  <div className="form-builder-field-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ display: "flex", gap: 2 }}>
                        <button type="button" className="btn btn-ghost" style={{ padding: "2px 4px" }} onClick={() => moveChamp(index, "up")} disabled={index === 0} title="Monter">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
                        </button>
                        <button type="button" className="btn btn-ghost" style={{ padding: "2px 4px" }} onClick={() => moveChamp(index, "down")} disabled={index === champs.length - 1} title="Descendre">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                      </div>
                      <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                        {typeIcons[champ.type]}
                        <span style={{ marginLeft: 4 }}>{typeLabels[champ.type]}</span>
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>#{index + 1}</span>
                    </div>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeChamp(champ.id)} title="Supprimer">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>

                  {/* Field config */}
                  {champ.type === "lien" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 12 }}>Titre / Texte du lien à afficher <span className="required">*</span></label>
                          <input
                            className="form-input"
                            type="text"
                            placeholder="ex: Guide complet des bourses (PDF)"
                            value={champ.label}
                            onChange={(e) => updateChamp(champ.id, { label: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 12 }}>URL cible cliquable (lien web) <span className="required">*</span></label>
                          <input
                            className="form-input"
                            type="url"
                            placeholder="ex: https://monsite.com/guide.pdf"
                            value={champ.options[0] || ""}
                            onChange={(e) => {
                              const newOpts = [...(champ.options || [])];
                              newOpts[0] = e.target.value;
                              updateChamp(champ.id, { options: newOpts });
                            }}
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 12 }}>Description explicative (optionnel)</label>
                        <input
                          className="form-input"
                          type="text"
                          placeholder="ex: Cliquez sur ce lien pour consulter les conditions requises avant de postuler"
                          value={champ.aide || ""}
                          onChange={(e) => updateChamp(champ.id, { aide: e.target.value || undefined })}
                        />
                      </div>

                      {/* Live preview banner for admin */}
                      <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Aperçu vu par le candidat :
                            </span>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>
                              {champ.label || "Titre du lien"}
                            </div>
                            {champ.aide && (
                              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                                {champ.aide}
                              </div>
                            )}
                          </div>
                          {champ.options[0] && (
                            <a
                              href={champ.options[0]}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 12px",
                                borderRadius: 8,
                                background: "#0a2d26",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: "none",
                              }}
                            >
                              <span>Ouvrir le lien</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                            </a>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#065f46", marginTop: 4 }}>
                          ℹ️ Ce champ sert uniquement à fournir une information ou ressource au candidat. Le candidat n'a pas à y saisir de réponse.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 12 }}>Label du champ</label>
                          <input
                            className="form-input"
                            type="text"
                            placeholder="ex: Nom complet"
                            value={champ.label}
                            onChange={(e) => updateChamp(champ.id, { label: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 12 }}>Texte d&apos;aide (optionnel)</label>
                          <input
                            className="form-input"
                            type="text"
                            placeholder="ex: Entrez votre nom et prénom"
                            value={champ.aide || ""}
                            onChange={(e) => updateChamp(champ.id, { aide: e.target.value || undefined })}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={champ.obligatoire}
                            onChange={(e) => updateChamp(champ.id, { obligatoire: e.target.checked })}
                            style={{ accentColor: "var(--accent-primary)" }}
                          />
                          Obligatoire
                        </label>
                      </div>

                      {/* Options for choix type */}
                      {champ.type === "choix" && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
                          <label className="form-label" style={{ fontSize: 12, marginBottom: 8 }}>Options</label>
                          {champ.options.map((opt, optIndex) => (
                            <div key={optIndex} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                              <span style={{ width: 20, height: 20, border: "2px solid var(--border-color-strong)", borderRadius: "50%", flexShrink: 0 }} />
                              <input
                                className="form-input"
                                type="text"
                                value={opt}
                                onChange={(e) => updateOption(champ.id, optIndex, e.target.value)}
                                style={{ flex: 1 }}
                              />
                              <button type="button" className="btn btn-ghost" style={{ padding: 4 }} onClick={() => removeOption(champ.id, optIndex)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                              </button>
                            </div>
                          ))}
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => addOption(champ.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Ajouter une option
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}

              {/* Add field */}
              {!showAddField ? (
                <div className="form-builder-add" onClick={() => setShowAddField(true)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: "0 auto 8px", display: "block" }}>
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Ajouter un champ</div>
                  <div style={{ fontSize: 12 }}>Cliquez pour choisir le type de champ</div>
                </div>
              ) : (
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Choisir le type de champ</h4>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddField(false)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      Annuler
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    {(Object.keys(typeLabels) as TypeChamp[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addChamp(type)}
                        style={{
                          padding: "16px 12px",
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-md)",
                          background: "var(--bg-card)",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                          transition: "all 150ms",
                          fontFamily: "inherit",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = "var(--accent-primary)";
                          e.currentTarget.style.background = "rgba(20,184,166,0.05)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = "var(--border-color)";
                          e.currentTarget.style.background = "var(--bg-card)";
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>{typeIcons[type]}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{typeLabels[type]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button type="submit" className="btn btn-primary" disabled={saving || uploadingImage}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              {saving ? "Création…" : "Créer la bourse"}
            </button>
            <Link href="/dashboard/bourses" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              Annuler
            </Link>
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "rgba(220,38,38,0.1)", color: "#dc2626", fontWeight: 600, fontSize: 13 }}>
              {error}
            </div>
          )}
          {saved && (
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "rgba(16,185,129,0.1)", color: "#059669", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>✓ Bourse créée avec succès ! Le lien d&apos;accès verif a été copié dans votre presse-papier.</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
