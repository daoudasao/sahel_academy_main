"use client";

import { useState, useEffect } from "react";
import InfoBanner from "@/app/components/InfoBanner";
import {
  CIBLES_ACTION,
  cibleLabel,
  compterCommentaires,
  formatDateTime,
  type ActionPost,
  type CiblePost,
  type Commentaire,
  type Media,
  type TypeMedia,
  type Post,
} from "@/app/lib/mock-data";
import { actualitesApi, uploadApi, boursesApi } from "@/app/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Image as ImageIcon,
  Video,
  Music,
  Send,
  MessageCircle,
  Heart,
  Trash2,
  Link as LinkIcon,
  Plus,
  X,
  FileText,
  Sparkles,
  Search,
  CheckCircle2,
  Megaphone,
  Filter,
  Eye,
  Paperclip,
  Radio,
  Share2,
} from "lucide-react";

function MediaView({ media, small }: { media: Media; small?: boolean }) {
  if (media.type === "photo") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={media.url}
        alt={media.nom || "photo"}
        className={`object-cover rounded-xl border border-slate-200 shadow-sm ${small ? 'w-24 h-24' : 'w-full max-h-[420px]'}`}
      />
    );
  }
  if (media.type === "video") {
    return (
      <video 
        src={media.url} 
        controls 
        className={`bg-black rounded-xl shadow-sm ${small ? 'w-36 h-24' : 'w-full max-h-[420px]'}`} 
      />
    );
  }
  return (
    <div className={`flex flex-col gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50/80 shadow-xs ${small ? 'w-48' : 'w-full max-w-sm'}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <Music className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="truncate">{media.nom || "Fichier audio"}</span>
      </div>
      <audio src={media.url} controls className="w-full h-8" />
    </div>
  );
}

function LigneCommentaire({ c, reply, onDelete, onReply }: { c: Commentaire; reply?: boolean; onDelete: () => void; onReply?: () => void }) {
  const isStaff = c.role === "Admin" || c.role === "Formateur";
  
  return (
    <div className={`flex gap-3 py-3 group/comm ${reply ? 'ml-10 mt-1 relative before:content-[""] before:absolute before:-left-5 before:-top-3 before:w-[2px] before:h-[30px] before:bg-emerald-200/60' : 'border-t border-slate-100 mt-2'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${isStaff ? 'bg-[#0a2d26] text-white' : 'bg-slate-200 text-slate-700'}`}>
        {c.auteur.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-slate-50 group-hover/comm:bg-slate-100/80 transition-colors rounded-2xl p-3 inline-block w-full border border-slate-100">
          <div className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-slate-900">{c.auteur}</span>
              {isStaff && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${c.role === "Admin" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {c.role}
                </span>
              )}
            </div>
            <button 
              className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50 opacity-0 group-hover/comm:opacity-100 focus:opacity-100" 
              onClick={onDelete} 
              title="Supprimer le commentaire"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{c.contenu}</p>
        </div>
        <div className="flex items-center gap-4 mt-1.5 ml-2 text-[11px] font-medium text-slate-500">
          <span>{formatDateTime(c.date)}</span>
          {reply ? (
            <span className="text-emerald-700 font-semibold">Réponse</span>
          ) : (
            onReply && (
              <button 
                className="text-[#0a2d26] hover:underline transition-colors font-bold"
                onClick={onReply}
              >
                Répondre
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function mapComment(c: any): Commentaire {
  return {
    id: c.id,
    auteur: c.auteur,
    role: c.role,
    contenu: c.contenu,
    date: c.createdAt ?? c.date ?? new Date().toISOString(),
    reponses: (c.reponses ?? []).map(mapComment),
  } as Commentaire;
}

function mapPost(p: any): Post {
  return {
    id: p.id,
    auteur: p.auteurNom ?? p.auteur ?? "Sahel Academy",
    role: p.role ?? "Admin",
    contenu: p.contenu,
    date: p.createdAt ?? p.date ?? new Date().toISOString(),
    documentNom: p.documentNom ?? undefined,
    medias: p.medias ?? undefined,
    actions: p.actions ?? [],
    likes: p.likes ?? 0,
    commentaires: (p.commentaires ?? []).map(mapComment),
  } as Post;
}

export default function ActualitePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [boursesList, setBoursesList] = useState<any[]>([]);

  useEffect(() => {
    actualitesApi.list().then((data) => setPosts((data ?? []).map(mapPost))).catch(() => {});
    boursesApi.list().then((data) => setBoursesList(data ?? [])).catch(() => {});
  }, []);
  
  const [contenu, setContenu] = useState("");
  const [documentNom, setDocumentNom] = useState("");
  const [medias, setMedias] = useState<Media[]>([]);
  
  const [actionLabel, setActionLabel] = useState("");
  const [actionCible, setActionCible] = useState<CiblePost | "">("");
  const [selectedBourseId, setSelectedBourseId] = useState("");
  
  const [search, setSearch] = useState("");
  const [publie, setPublie] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const [commentToDelete, setCommentToDelete] = useState<{postId: string, commentId: string} | null>(null);

  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const onFichier = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingMedia(true);
    try {
      const type: TypeMedia = file.type.startsWith("video")
        ? "video"
        : file.type.startsWith("audio")
        ? "audio"
        : "photo";
        
      const response = await uploadApi(file, "actualites");
      setMedias((m) => [...m, { type, url: response.url, nom: file.name }]);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'upload du fichier");
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  const onDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    try {
      const response = await uploadApi(file, "actualites");
      if (response?.url) {
        setDocumentNom(`${file.name}|${response.url}`);
      } else {
        alert("Le serveur n'a pas renvoyé d'URL pour ce fichier.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors du téléversement du document");
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };
  
  const removeMedia = (i: number) => setMedias((m) => m.filter((_, idx) => idx !== i));

  const publier = async () => {
    if (!contenu.trim() || publishing) return;
    
    const newActions: ActionPost[] = [];
    if (actionLabel.trim() && actionCible) {
      let targetCible: string = actionCible;
      if (actionCible === "resultats" && selectedBourseId) {
        targetCible = `resultats:${selectedBourseId}`;
      } else if (actionCible === "bourses" && selectedBourseId) {
        targetCible = `bourse/${selectedBourseId}`;
      }
      newActions.push({ label: actionLabel.trim(), cible: targetCible as CiblePost });
    }

    setPublishing(true);
    try {
      const nouveauBackend = await actualitesApi.create({
        auteurNom: "Sahel Academy",
        role: "Admin",
        contenu: contenu.trim(),
        documentNom: documentNom.trim() || undefined,
        medias: medias.length ? medias : undefined,
        actions: newActions,
      });

      const nouveau: Post = nouveauBackend?.id
        ? mapPost({ ...nouveauBackend, commentaires: nouveauBackend.commentaires ?? [] })
        : {
            id: "po" + Date.now(),
            auteur: "Sahel Academy",
            role: "Admin",
            contenu: contenu.trim(),
            date: new Date().toISOString(),
            documentNom: documentNom.trim() || undefined,
            medias: medias.length ? [...medias] : undefined,
            actions: newActions,
            likes: 0,
            commentaires: [],
          } as Post;
      
      setPosts((p) => [nouveau, ...p]);
      setContenu("");
      setDocumentNom("");
      setActionLabel("");
      setActionCible("");
      setSelectedBourseId("");
      setMedias([]);
      setPublie(true);
      setPreviewMode(false);
      setTimeout(() => setPublie(false), 3500);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la publication");
    } finally {
      setPublishing(false);
    }
  };

  const supprimerPost = async (id: string) => {
    try {
      await actualitesApi.remove(id);
      setPosts((p) => p.filter((x) => x.id !== id));
    } catch { alert("Erreur lors de la suppression"); }
  };

  const supprimerCommentaire = async () => {
    if (!commentToDelete) return;
    const { postId, commentId } = commentToDelete;
    try { await actualitesApi.removeCommentaire(postId, commentId); } catch { /* ignore */ }
    setPosts((ps) =>
      ps.map((p) =>
        p.id !== postId
          ? p
          : {
              ...p,
              commentaires: p.commentaires
                .filter((c) => c.id !== commentId)
                .map((c) => ({ ...c, reponses: c.reponses.filter((r) => r.id !== commentId) })),
            }
      )
    );
    setCommentToDelete(null);
  };

  const submitReply = async (postId: string, commentId: string) => {
    if (!replyContent.trim()) return;
    let reponse: Commentaire;
    try {
      const created = await actualitesApi.addCommentaire(postId, {
        auteur: "Sahel Academy",
        role: "Admin",
        contenu: replyContent.trim(),
        parentId: commentId,
      });
      reponse = mapComment(created);
    } catch {
      alert("Erreur lors de l'envoi de la réponse");
      return;
    }
    setPosts(ps => ps.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        commentaires: p.commentaires.map(c => (c.id !== commentId ? c : { ...c, reponses: [...c.reponses, reponse] })),
      };
    }));
    setReplyingToId(null);
    setReplyContent("");
  };

  const filteredPosts = posts.filter(p => 
    p.contenu.toLowerCase().includes(search.toLowerCase()) ||
    p.auteur.toLowerCase().includes(search.toLowerCase())
  );

  const totalCommentaires = posts.reduce((sum, p) => sum + compterCommentaires(p.commentaires), 0);

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Toast de confirmation de publication */}
      {publie && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-[#0a2d26] text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/30 animate-in slide-in-from-bottom-5 duration-300 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>L'annonce a été publiée avec succès sur le fil des étudiants !</span>
        </div>
      )}

      {/* Compact Green Header Banner */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <Megaphone className="w-3 h-3" />
              <span>Communication & Annonces</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Fil d'Actualités & Communauté
            </h1>
            <p className="text-xs text-emerald-100/75 leading-relaxed">
              Publiez des annonces en direct et modérez les échanges des étudiants.
            </p>
          </div>
        </div>

        {/* Compact Stat Bar */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <Megaphone className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Annonces:</span>
            <span className="font-bold text-white">{posts.length}</span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <MessageCircle className="w-4 h-4 text-indigo-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Commentaires:</span>
            <span className="font-bold text-white">{totalCommentaires}</span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <Radio className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-emerald-100/70 font-medium">Portée:</span>
            <span className="font-bold text-white">Tous les membres</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Main Column: Composer + Timeline (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Nouveau Éditeur d'Annonce Premium */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0a2d26] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  SA
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Nouvelle Publication</h2>
                  <p className="text-[11px] text-slate-500">Transmise immédiatement sur le fil d'actualité de l'app mobile</p>
                </div>
              </div>

              {contenu.trim() && (
                <button
                  type="button"
                  onClick={() => setPreviewMode(!previewMode)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{previewMode ? "Éditer" : "Aperçu"}</span>
                </button>
              )}
            </div>

            {previewMode ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">Sahel Academy</span>
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Admin</span>
                  <span className="text-xs text-slate-400">• À l'instant</span>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{contenu}</p>
                {medias.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {medias.map((m, i) => <MediaView key={i} media={m} small />)}
                  </div>
                )}
                {documentNom && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-lg p-2.5 w-max">
                    <FileText className="w-4 h-4" />
                    <span className="font-semibold">{documentNom}</span>
                  </div>
                )}
                {actionLabel && actionCible && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#0a2d26] text-white px-3.5 py-1.5 rounded-full">
                      {actionLabel} <LinkIcon className="w-3 h-3 text-emerald-300" />
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                <textarea 
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm resize-y p-3.5 focus:ring-2 focus:ring-[#0a2d26]/20 focus:border-[#0a2d26] transition-all min-h-[90px] outline-none" 
                  placeholder="Rédigez votre message ou annonce ici..." 
                  value={contenu} 
                  onChange={(e) => setContenu(e.target.value)} 
                />

                {/* Attachments preview */}
                {medias.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                    {medias.map((m, i) => (
                      <div key={i} className="relative group/media inline-block">
                        <MediaView media={m} small />
                        <button
                          onClick={() => removeMedia(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                          title="Retirer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Options complémentaires (Document & Bouton d'action) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-slate-500" /> Document joint
                      </span>
                      {documentNom && (
                        <button
                          type="button"
                          onClick={() => setDocumentNom("")}
                          className="text-[11px] text-red-500 hover:underline font-medium"
                        >
                          Retirer
                        </button>
                      )}
                    </label>
                    {documentNom ? (
                      <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200/80 rounded-lg text-xs">
                        <div className="flex items-center gap-2 text-emerald-900 font-semibold truncate">
                          <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="truncate">{documentNom.split("|")[0]}</span>
                        </div>
                        <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-full font-bold shrink-0">
                          Fichier prêt
                        </span>
                      </div>
                    ) : (
                      <label className={`w-full py-2 px-3 rounded-lg text-xs font-semibold border border-dashed transition cursor-pointer flex items-center justify-center gap-2 ${uploadingMedia ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-emerald-500"}`}>
                        <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{uploadingMedia ? "Téléversement..." : "Cliquez pour téléverser un document (PDF, Word, etc.)"}</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                          onChange={onDocumentUpload}
                          className="hidden"
                          disabled={uploadingMedia}
                        />
                      </label>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-slate-500" /> Bouton Raccourci in-app
                    </label>
                    <select 
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#0a2d26] text-xs font-medium" 
                      value={actionCible} 
                      onChange={(e) => {
                        const val = e.target.value as CiblePost | "";
                        setActionCible(val);
                        if (val) {
                          const found = CIBLES_ACTION.find((x) => x.value === val);
                          setActionLabel(found?.label || "");
                        } else {
                          setActionLabel("");
                        }
                      }}
                    >
                      <option value="">-- Aucun bouton d'action --</option>
                      {CIBLES_ACTION.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>

                    {(actionCible === "resultats" || actionCible === "bourses") && (
                      <div className="mt-2">
                        <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                          Bourse ciblée (optionnel)
                        </label>
                        <select
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#0a2d26] text-xs font-medium"
                          value={selectedBourseId}
                          onChange={(e) => setSelectedBourseId(e.target.value)}
                        >
                          <option value="">-- Toutes les bourses (générique) --</option>
                          {boursesList.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.titre}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Toolbar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${uploadingMedia ? "bg-slate-100 text-slate-400" : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"}`}>
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600" /> Photo/Vidéo
                      <input type="file" accept="image/*,video/*" onChange={onFichier} className="hidden" disabled={uploadingMedia} />
                    </label>
                    {uploadingMedia && <span className="text-xs text-emerald-700 font-medium">Téléversement...</span>}
                  </div>

                  <button 
                    type="button" 
                    className="bg-[#0a2d26] hover:bg-[#0a2d26]/90 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-md active:scale-95" 
                    onClick={publier}
                    disabled={!contenu.trim() || publishing}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {publishing ? "Envoi..." : "Publier l'annonce"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Feed Stream Header */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-emerald-700" />
              <span>Publications récentes</span>
            </h3>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {filteredPosts.length} post(s)
            </span>
          </div>

          {/* Posts List */}
          <div className="space-y-4">
            {filteredPosts.map((p) => (
              <div key={p.id} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col group/post hover:border-slate-300 transition-all">
                <div className="p-4 sm:p-5">
                  {/* Header du post */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0a2d26] to-[#124b40] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        SA
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">{p.auteur}</span>
                          {p.role === "Admin" && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Officiel
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">{formatDateTime(p.date)}</span>
                      </div>
                    </div>
                    
                    <button 
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover/post:opacity-100 focus:opacity-100"
                      onClick={() => supprimerPost(p.id)}
                      title="Supprimer la publication"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Contenu principal */}
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm">
                    {p.contenu}
                  </p>

                  {/* Médias */}
                  {p.medias && p.medias.length > 0 && (
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {p.medias.map((m, i) => (<MediaView key={i} media={m} />))}
                    </div>
                  )}

                  {/* Pièce jointe PDF */}
                  {p.documentNom && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/80 border border-emerald-200/60 rounded-lg p-2.5 w-max max-w-full">
                      <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="font-semibold truncate">{p.documentNom}</span>
                    </div>
                  )}

                  {/* Action Buttons In-App */}
                  {p.actions.length > 0 && (
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {p.actions.map((a, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs font-bold bg-[#0a2d26] text-white px-3 py-1.5 rounded-full shadow-xs" title={`Lien application : ${cibleLabel(a.cible)}`}>
                          {a.label}
                          <LinkIcon className="w-3 h-3 text-emerald-300" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Likes & Stats */}
                <div className="px-4 sm:px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    <span>{p.likes} J'aime</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{compterCommentaires(p.commentaires)} commentaire(s)</span>
                    <MessageCircle className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Zone de Modération des Commentaires */}
                {p.commentaires.length > 0 && (
                  <div className="px-4 sm:px-5 py-3 bg-white border-t border-slate-100">
                    <div className="flex flex-col mb-2">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commentaires des membres</h4>
                    </div>
                    
                    <div className="space-y-1">
                      {p.commentaires.map((c) => (
                        <div key={c.id}>
                          <LigneCommentaire c={c} onDelete={() => setCommentToDelete({ postId: p.id, commentId: c.id })} onReply={() => setReplyingToId(c.id)} />
                          {replyingToId === c.id && (
                            <div className="ml-10 mt-2 mb-3 flex gap-2">
                              <input 
                                type="text" 
                                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0a2d26]" 
                                placeholder="Réponse administrateur..." 
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                autoFocus
                              />
                              <button 
                                className="px-3 py-1.5 bg-[#0a2d26] text-white text-xs font-bold rounded-lg hover:bg-[#0a2d26]/90 transition-colors"
                                onClick={() => submitReply(p.id, c.id)}
                              >
                                Envoyer
                              </button>
                              <button 
                                className="px-2 text-slate-400 hover:text-slate-600"
                                onClick={() => { setReplyingToId(null); setReplyContent(""); }}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          {c.reponses.map((r) => (
                            <LigneCommentaire key={r.id} c={r} reply onDelete={() => setCommentToDelete({ postId: p.id, commentId: r.id })} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {filteredPosts.length === 0 && (
              <div className="text-center py-12 bg-white border border-slate-200 border-dashed rounded-xl sm:rounded-2xl p-6">
                <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">Aucune publication trouvée.</p>
                <p className="text-xs text-slate-400 mt-1">Créez votre première annonce à l'aide du formulaire ci-dessus.</p>
              </div>
            )}
          </div>

        </div>

        {/* Sidebar Column: Search, Guides & Tips (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Search Box */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">Recherche</h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrer les annonces..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0a2d26] text-slate-800"
              />
            </div>
          </div>

          {/* Guide de Modération */}
          <div className="bg-gradient-to-br from-slate-900 to-[#0a2d26] rounded-xl text-white p-4 space-y-3 shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">Règles de Modération</h3>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              En tant qu'administrateur, vos publications sont mises en avant avec le badge <strong>Officiel</strong>. 
            </p>
            <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
              <li>Supprimez directement tout commentaire inapproprié en le survolant.</li>
              <li>Utilisez les mémos vocaux ou vidéos pour des annonces importantes.</li>
              <li>Ajoutez un bouton de raccourci vers les bourses ou formations.</li>
            </ul>
          </div>

        </div>

      </div>

      {/* Modal Suppression de Commentaire */}
      <Dialog open={!!commentToDelete} onOpenChange={(open) => !open && setCommentToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2 text-base">
              <Trash2 className="w-5 h-5" />
              Supprimer le commentaire
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs text-slate-600">
              Êtes-vous sûr de vouloir supprimer ce commentaire ?<br/><br/>
              Cette action est <strong className="text-slate-900">irréversible</strong> et le commentaire sera définitivement supprimé.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2.5 pt-3 mt-2">
            <button 
              className="inline-flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 h-9 px-4"
              onClick={() => setCommentToDelete(null)}
            >
              Annuler
            </button>
            <button 
              className="inline-flex items-center justify-center rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 h-9 px-4"
              onClick={supprimerCommentaire}
            >
              Oui, supprimer
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
