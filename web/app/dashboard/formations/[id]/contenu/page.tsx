"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { classesApi, formationsApi, uploadApi } from "@/app/lib/api";
import InfoBanner from "@/app/components/InfoBanner";
import {
  BookOpen,
  FileText,
  MessageSquare,
  Trash2,
  ArrowLeft,
  Paperclip,
} from "lucide-react";

export default function ContenuFormationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const formationId = resolvedParams.id;

  const [formation, setFormation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire d'annonce
  const [nouveauMessage, setNouveauMessage] = useState("");
  const [documentNom, setDocumentNom] = useState("");
  const [publishingMessage, setPublishingMessage] = useState(false);
  const [uploadingMessageDoc, setUploadingMessageDoc] = useState(false);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const [fData, mData] = await Promise.all([
        formationsApi.get(formationId).catch(() => null),
        classesApi.getMessages(formationId).catch(() => []),
      ]);
      setFormation(fData);
      setMessages(mData ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [formationId]);

  // Publier un message de cours
  const publierMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouveauMessage.trim() || publishingMessage) return;

    setPublishingMessage(true);
    try {
      await classesApi.createMessage(formationId, {
        auteurNom: "Formateur Sahel Academy",
        auteurRole: "Formateur",
        contenu: nouveauMessage.trim(),
        documentNom: documentNom.trim() || undefined,
      });
      setNouveauMessage("");
      setDocumentNom("");
      await chargerDonnees();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la publication de l'annonce");
    } finally {
      setPublishingMessage(false);
    }
  };

  // Upload d'un fichier joint pour une annonce
  const onDocumentMessageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMessageDoc(true);
    try {
      const res = await uploadApi(file, "documents");
      if (res?.url) {
        setDocumentNom(`${file.name}|${res.url}`);
      } else {
        alert("Le serveur n'a pas renvoyé d'URL valide.");
      }
    } catch (err) {
      console.error("Erreur lors de l'upload du document joint:", err);
      alert("Erreur lors du téléversement du fichier.");
    } finally {
      setUploadingMessageDoc(false);
    }
  };

  // Supprimer un message
  const supprimerMessage = async (messageId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;
    try {
      await classesApi.removeMessage(messageId);
      await chargerDonnees();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression de l'annonce");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a2d26]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Retour & Header */}
      <div>
        <Link
          href="/dashboard/formations"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Retour aux formations
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#0a2d26]/10 text-[#0a2d26] rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">
                Espace Classe : {formation?.titre || "Formation"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Gérez les annonces et les documents pédagogiques joints aux cours pour cette classe.
              </p>
            </div>
          </div>
        </div>
      </div>

      <InfoBanner
        variant="info"
        title="Synchronisation en temps réel avec l'application mobile"
      >
        Tous les messages et fichiers joints ajoutés ici apparaissent instantanément sur l&apos;application mobile des élèves inscrits dans l&apos;écran de classe (<code className="bg-slate-200/60 px-1 rounded">/classe/{formationId}</code>).
      </InfoBanner>

      {/* ── SECTION ANNONCES & FICHIERS DU COURS ── */}
      <div className="space-y-6">
        {/* Formulaire de publication d'annonce */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#0a2d26]" /> Publier une annonce aux élèves
          </h2>
          <form onSubmit={publierMessage} className="space-y-3">
            <textarea
              rows={3}
              placeholder="Rédigez votre annonce ou consignes de cours..."
              value={nouveauMessage}
              onChange={(e) => setNouveauMessage(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#0a2d26] focus:bg-white transition"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" /> Pièce jointe / Document (optionnel)
                </label>
                {documentNom && (
                  <button
                    type="button"
                    onClick={() => setDocumentNom("")}
                    className="text-xs text-red-500 hover:underline font-semibold cursor-pointer"
                  >
                    Retirer
                  </button>
                )}
              </div>
              {documentNom ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-semibold truncate">
                    <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="truncate">{documentNom.split("|")[0]}</span>
                  </div>
                  <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-full font-bold shrink-0">
                    Fichier prêt
                  </span>
                </div>
              ) : (
                <label className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold border-2 border-dashed transition cursor-pointer flex items-center justify-center gap-2 ${uploadingMessageDoc ? "bg-slate-50 text-slate-400 border-slate-200" : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-emerald-500"}`}>
                  <Paperclip className="w-4 h-4 text-emerald-600" />
                  <span>{uploadingMessageDoc ? "Téléversement..." : "Téléverser un document pour cette annonce (PDF, Word, etc.)"}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*"
                    onChange={onDocumentMessageUpload}
                    className="hidden"
                    disabled={uploadingMessageDoc}
                  />
                </label>
              )}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!nouveauMessage.trim() || publishingMessage}
                  className="px-5 py-2 bg-[#0a2d26] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#0a2d26]/90 transition disabled:opacity-50 cursor-pointer"
                >
                  {publishingMessage ? "Publication..." : "Publier l'annonce"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Liste des annonces */}
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            Annonces publiées ({messages.length})
          </h2>
          {messages.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center text-slate-400 text-xs">
              Aucune annonce publiée pour ce cours.
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#0a2d26]/10 text-[#0a2d26] font-bold text-xs flex items-center justify-center">
                      {m.auteurNom?.charAt(0) || "F"}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-xs">{m.auteurNom}</span>
                      <span className="text-[10px] text-slate-400 ml-2">
                        {new Date(m.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => supprimerMessage(m.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {m.contenu}
                </p>
                {m.documentNom && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{m.documentNom.split("|")[0]}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
