"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import InfoBanner from "@/app/components/InfoBanner";
import { supportApi, uploadApi, BASE } from "@/app/lib/api";
import { io, Socket } from "socket.io-client";
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  CheckCheck,
  Phone,
  Mail,
  MessageSquare,
  MessageCircle,
  Clock,
  CheckCircle2,
  Inbox,
  RefreshCw,
  FileText,
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
  Volume2,
  Mic,
  Square,
  Trash2,
  Play,
  Pause,
} from "lucide-react";

// Types d'API Backend
export type ExpediteurSupport = "client" | "support";

export type SupportMessageDto = {
  id: string;
  userId: string;
  expediteur: ExpediteurSupport;
  contenu: string;
  type: string; // "texte" | "audio" | "fichier"
  audioUrl?: string | null;
  dureeSeconds?: number | null;
  lu: boolean;
  createdAt: string;
};

export type SupportConversationDto = {
  id: string; // userId
  nom: string;
  email: string;
  telephone?: string | null;
  image?: string | null;
  lastMessage?: SupportMessageDto | null;
  unreadCount: number;
};

type TicketStatus = "open" | "closed" | "pending";

const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; dot: string; badge: string }
> = {
  open: {
    label: "Ouvert",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  pending: {
    label: "En attente",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  closed: {
    label: "Résolu",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

type FilterKey = "all" | TicketStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "open", label: "Ouvertes" },
  { key: "pending", label: "En attente" },
  { key: "closed", label: "Résolues" },
];

function formatTime(dateIso: string): string {
  try {
    const date = new Date(dateIso);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDateHeader(dateIso: string): string {
  try {
    const date = new Date(dateIso);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Aujourd'hui";
    if (isYesterday) return "Hier";
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateIso;
  }
}

export default function SupportPage() {
  const [conversations, setConversations] = useState<SupportConversationDto[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessageDto[]>([]);
  
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  // Statut et état de l'enregistrement vocal
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Statuts de résolution gérés localement
  const [closedUserIds, setClosedUserIds] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Nettoyage lors du démontage ou changement d'URL de prévisualisation
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // Scroll automatique en bas du fil de discussion
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Charger la liste des conversations
  const fetchConversations = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingConversations(true);
    setError(null);
    try {
      const data = await supportApi.getConversations();
      setConversations(data || []);
      
      // Si aucune conversation active n'est sélectionnée et qu'il y a des conversations, sélectionner la 1ère
      setActiveUserId((prev) => {
        if (!prev && data && data.length > 0) {
          return data[0].id;
        }
        return prev;
      });
    } catch (err: any) {
      console.error("Erreur lors de la récupération des conversations support:", err);
      if (!isSilent) setError(err?.message || "Impossible de charger les conversations de support.");
    } finally {
      if (!isSilent) setLoadingConversations(false);
    }
  }, []);

  // Charger les messages de la conversation active
  const fetchMessages = useCallback(async (userId: string, isSilent = false) => {
    if (!isSilent) setLoadingMessages(true);
    try {
      const data = await supportApi.getConversation(userId);
      setMessages(data || []);

      // Remettre à zéro le compteur de messages non lus pour cet utilisateur
      setConversations((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err: any) {
      console.error(`Erreur lors du chargement des messages pour ${userId}:`, err);
    } finally {
      if (!isSilent) setLoadingMessages(false);
    }
  }, []);

  // Effet initial : charger les conversations et configurer WebSocket + Polling
  useEffect(() => {
    fetchConversations();

    // Polling de secours toutes les 8 secondes
    const interval = setInterval(() => {
      fetchConversations(true);
      if (activeUserId) {
        fetchMessages(activeUserId, true);
      }
    }, 8000);

    // Initialisation WebSocket Socket.IO
    const socketBase = BASE.replace(/\/api\/v1\/?$/, "");

    try {
      const socket = io(`${socketBase}/support`, {
        transports: ["websocket", "polling"],
        withCredentials: true,
      });

      socket.on("connect", () => {
        console.log("WebSocket Support Admin connecté");
      });

      socket.on("new_message", (msg: SupportMessageDto) => {
        console.log("Nouveau message support reçu via WebSocket :", msg);
        
        // Mettre à jour les messages de la discussion active si ça concerne l'utilisateur ouvert
        setActiveUserId((currentActiveId) => {
          if (currentActiveId === msg.userId) {
            setMessages((prevMsgs) => {
              if (prevMsgs.some((m) => m.id === msg.id)) return prevMsgs;
              return [...prevMsgs, msg];
            });
          }
          return currentActiveId;
        });

        // Mettre à jour la liste des conversations
        setConversations((prevConvs) => {
          const exists = prevConvs.some((c) => c.id === msg.userId);
          if (!exists) {
            fetchConversations(true);
            return prevConvs;
          }
          return prevConvs.map((c) => {
            if (c.id === msg.userId) {
              const isCurrent = activeUserId === msg.userId;
              return {
                ...c,
                lastMessage: msg,
                unreadCount: isCurrent || msg.expediteur === "support" ? c.unreadCount : c.unreadCount + 1,
              };
            }
            return c;
          });
        });
      });

      socketRef.current = socket;
    } catch (e) {
      console.warn("Impossible d'initialiser le WebSocket support:", e);
    }

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [fetchConversations, fetchMessages, activeUserId]);

  // Charger les messages au changement de conversation active
  useEffect(() => {
    if (activeUserId) {
      fetchMessages(activeUserId);
    } else {
      setMessages([]);
    }
  }, [activeUserId, fetchMessages]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeUserId) || null,
    [conversations, activeUserId]
  );

  // Déterminer le statut virtuel de la conversation
  const getTicketStatus = useCallback(
    (c: SupportConversationDto): TicketStatus => {
      if (closedUserIds[c.id]) return "closed";
      if (c.unreadCount > 0) return "open";
      if (c.lastMessage?.expediteur === "client") return "pending";
      return "open";
    },
    [closedUserIds]
  );

  // Statistiques globales
  const stats = useMemo(() => {
    const total = conversations.length;
    let openCount = 0;
    let pendingCount = 0;
    let unreadTotal = 0;

    conversations.forEach((c) => {
      const st = getTicketStatus(c);
      if (st === "open") openCount++;
      if (st === "pending") pendingCount++;
      unreadTotal += c.unreadCount || 0;
    });

    return {
      total,
      open: openCount,
      pending: pendingCount,
      unread: unreadTotal,
    };
  }, [conversations, getTicketStatus]);

  // Envoi d'un message texte
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeUserId || sending) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const created = await supportApi.sendMessage(activeUserId, {
        contenu: content,
        type: "texte",
      });

      setMessages((prev) => [...prev, created]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeUserId
            ? { ...c, lastMessage: created, unreadCount: 0 }
            : c
        )
      );

      // Si le ticket était fermé, le rouvrir automatiquement
      if (closedUserIds[activeUserId]) {
        setClosedUserIds((prev) => ({ ...prev, [activeUserId]: false }));
      }
    } catch (err: any) {
      alert("Erreur lors de l'envoi du message : " + (err.message || "Erreur serveur"));
    } finally {
      setSending(false);
    }
  };

  // Upload et envoi de pièce jointe / audio
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeUserId) return;

    const file = files[0];
    setUploading(true);

    try {
      const res = await uploadApi(file, "support");
      const isAudio = file.type.startsWith("audio/") || file.name.endsWith(".mp3") || file.name.endsWith(".m4a");
      const isImage = file.type.startsWith("image/");

      const type = isAudio ? "audio" : isImage ? "image" : "fichier";
      const created = await supportApi.sendMessage(activeUserId, {
        contenu: file.name,
        type: type,
        audioUrl: res.url,
      });

      setMessages((prev) => [...prev, created]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeUserId
            ? { ...c, lastMessage: created, unreadCount: 0 }
            : c
        )
      );
    } catch (err: any) {
      alert("Erreur lors de l'upload du fichier : " + (err.message || "Erreur serveur"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Formatage de la durée d'enregistrement (MM:SS)
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Démarrer l'enregistrement vocal
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Votre navigateur ne prend pas en charge l'enregistrement audio.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Préférer audio/webm s'il est supporté, sinon laisser le navigateur choisir
      const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? { mimeType: "audio/webm;codecs=opus" }
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? { mimeType: "audio/mp4" }
        : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioPreviewUrl(url);

        // Désactiver le micro
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Erreur d'accès au microphone:", err);
      alert("Impossible d'accéder au microphone. Veuillez autoriser l'accès au micro dans votre navigateur.");
    }
  };

  // Stopper l'enregistrement
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Annuler et effacer l'enregistrement
  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingSeconds(0);
    setIsPreviewPlaying(false);
  };

  // Toggle lecture preview audio
  const togglePlayPreview = () => {
    if (!previewAudioRef.current) return;
    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().catch(() => setIsPreviewPlaying(false));
      setIsPreviewPlaying(true);
    }
  };

  // Envoi du message vocal au client/étudiant
  const handleSendVoiceMessage = async () => {
    if (!audioBlob || !activeUserId || sending) return;

    setSending(true);
    try {
      const mimeType = audioBlob.type || "audio/webm";
      const ext = mimeType.includes("mp4") || mimeType.includes("aac") ? "m4a" : "webm";
      const audioFile = new File([audioBlob], `vocal_admin_${Date.now()}.${ext}`, { type: mimeType });

      const res = await uploadApi(audioFile, "support");
      const duree = recordingSeconds > 0 ? recordingSeconds : 1;

      const created = await supportApi.sendMessage(activeUserId, {
        contenu: "Message vocal",
        type: "audio",
        audioUrl: res.url,
        dureeSeconds: duree,
      });

      setMessages((prev) => [...prev, created]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeUserId
            ? { ...c, lastMessage: created, unreadCount: 0 }
            : c
        )
      );

      if (closedUserIds[activeUserId]) {
        setClosedUserIds((prev) => ({ ...prev, [activeUserId]: false }));
      }

      cancelRecording();
    } catch (err: any) {
      alert("Erreur lors de l'envoi du message vocal : " + (err.message || "Erreur serveur"));
    } finally {
      setSending(false);
    }
  };

  const toggleResolve = () => {
    if (!activeUserId) return;
    setClosedUserIds((prev) => ({
      ...prev,
      [activeUserId]: !prev[activeUserId],
    }));
  };

  // Filtrage des conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const st = getTicketStatus(c);
      const matchesFilter = filter === "all" || st === filter;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        c.nom.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        (c.lastMessage?.contenu || "").toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [conversations, filter, searchQuery, getTicketStatus]);

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Le breadcrumb + le bouton Mode Sombre sont déjà fournis par
          DashboardShell (layout) — ne pas les remettre ici (doublon). */}

      {/* Header vert compact */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <MessageCircle className="w-3 h-3" />
              <span>Assistance en direct</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Support Client
              <button
                onClick={() => fetchConversations()}
                title="Rafraîchir les conversations"
                className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-200 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loadingConversations ? "animate-spin" : ""}`} />
              </button>
            </h1>
            <p className="text-xs text-emerald-100/75 leading-relaxed">
              Messagerie centralisée pour l&apos;assistance des étudiants et utilisateurs de Sahel Academy.
            </p>
          </div>

          {stats.unread > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs font-medium backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {stats.unread} message{stats.unread > 1 ? "s" : ""} non lu{stats.unread > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Conversations", value: stats.total, icon: MessageSquare, color: "text-blue-600", hint: "Total des fils de discussion" },
          { label: "Ouvertes", value: stats.open, icon: Inbox, color: "text-emerald-600", hint: "Demandes en cours" },
          { label: "En attente", value: stats.pending, icon: Clock, color: "text-amber-600", hint: "Attente de réponse admin" },
          { label: "Non lus", value: stats.unread, icon: CheckCircle2, color: "text-purple-600", hint: "Messages étudiants non consultés" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card text-card-foreground shadow-sm bg-white p-3.5 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-row items-center justify-between space-y-0 pb-1.5">
                <h3 className="tracking-tight text-xs sm:text-sm font-medium text-slate-500 truncate" title={s.label}>{s.label}</h3>
                <s.icon className={`h-4 w-4 ${s.color} shrink-0 ml-1`} />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{s.value}</div>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-1">{s.hint}</p>
          </div>
        ))}
      </div>

      <InfoBanner>
        <strong>Assistance active :</strong> Répondez en direct aux étudiants et candidats.<br />
        <strong>WebSocket synchronisé :</strong> Les nouveaux messages clients s&apos;affichent automatiquement sans rechargement de la page.
      </InfoBanner>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchConversations()}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Interface de messagerie */}
      <div className="bg-white dark:bg-[#111c24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[720px]">
        {/* Colonne gauche : liste des conversations */}
        <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#111c24] shrink-0 h-[40vh] md:h-full">
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#15222e] border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0a2d26]/20 focus:border-[#0a2d26] dark:focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtres de statut */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors border ${
                      active
                        ? "bg-[#0a2d26] text-white border-[#0a2d26] dark:bg-emerald-600 dark:border-emerald-600"
                        : "bg-slate-50 dark:bg-[#15222e] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="p-8 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#0a2d26] dark:text-emerald-400" />
                <span className="text-xs">Chargement des conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400 space-y-1">
                <Inbox className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-medium text-slate-600 dark:text-slate-300">Aucune conversation</p>
                <p className="text-xs text-slate-400">Aucun message ne correspond à vos critères.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const st = getTicketStatus(conv);
                const cfg = STATUS_CONFIG[st];
                const isActive = activeUserId === conv.id;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveUserId(conv.id)}
                    className={`w-full text-left p-3.5 border-b border-slate-100 dark:border-slate-800/80 transition-colors relative flex items-start gap-3 ${
                      isActive 
                        ? "bg-slate-100/90 dark:bg-[#1c2d3d]" 
                        : "bg-transparent hover:bg-slate-50 dark:hover:bg-[#15222e]"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0a2d26] dark:bg-emerald-500" />
                    )}

                    <div className="relative shrink-0">
                      {conv.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={conv.image} alt={conv.nom} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#0a2d26]/10 dark:bg-emerald-500/20 flex items-center justify-center text-[#0a2d26] dark:text-emerald-400 font-bold text-sm">
                          {conv.nom ? conv.nom.charAt(0).toUpperCase() : "U"}
                        </div>
                      )}
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${cfg.dot} border-2 border-white dark:border-slate-900 rounded-full`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h3 className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"}`}>
                          {conv.nom}
                        </h3>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2 shrink-0">
                            {formatTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate ${conv.unreadCount > 0 ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>
                        {conv.lastMessage
                          ? conv.lastMessage.type === "audio"
                            ? "🎙️ Message vocal"
                            : conv.lastMessage.type === "fichier"
                            ? "📎 Pièce jointe"
                            : conv.lastMessage.contenu
                          : "Discussion ouverte"}
                      </p>
                    </div>

                    {conv.unreadCount > 0 && (
                      <div className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0 mt-0.5 shadow-xs">
                        {conv.unreadCount}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Colonne droite : fil de discussion */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col h-[60vh] md:h-full min-w-0 bg-white dark:bg-[#111c24]">
            {/* En-tête du chat */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111c24] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {activeConversation.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeConversation.image} alt={activeConversation.nom} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#0a2d26]/10 dark:bg-emerald-500/20 flex items-center justify-center text-[#0a2d26] dark:text-emerald-400 font-bold text-lg shrink-0">
                    {activeConversation.nom ? activeConversation.nom.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{activeConversation.nom}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_CONFIG[getTicketStatus(activeConversation)].badge}`}>
                      {STATUS_CONFIG[getTicketStatus(activeConversation)].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5 min-w-0">
                    {activeConversation.email && (
                      <a href={`mailto:${activeConversation.email}`} className="flex items-center gap-1 truncate hover:text-[#0a2d26] dark:hover:text-emerald-400">
                        <Mail className="w-3 h-3 shrink-0 text-slate-400" /> {activeConversation.email}
                      </a>
                    )}
                    {activeConversation.telephone && (
                      <a href={`tel:${activeConversation.telephone}`} className="hidden sm:flex items-center gap-1 whitespace-nowrap hover:text-[#0a2d26] dark:hover:text-emerald-400">
                        <Phone className="w-3 h-3 shrink-0 text-slate-400" /> {activeConversation.telephone}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => fetchMessages(activeConversation.id)}
                  title="Rafraîchir la discussion"
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMessages ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={toggleResolve}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hidden sm:flex items-center gap-1.5 ${
                    closedUserIds[activeConversation.id]
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                      : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {closedUserIds[activeConversation.id] ? "Rouvrir" : "Résoudre"}
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/60 dark:bg-[#0b1319] space-y-3">
              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0a2d26] dark:text-emerald-400" />
                  <span className="text-xs">Chargement du fil de discussion...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                  <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-medium text-slate-600 dark:text-slate-300">Aucun message dans cette conversation.</p>
                  <p className="text-xs text-slate-400">Écrivez un message ci-dessous pour démarrer la réponse.</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isAdmin = msg.expediteur === "support";
                  const prev = messages[index - 1];
                  const next = messages[index + 1];

                  const dateLabel = formatDateHeader(msg.createdAt);
                  const prevDateLabel = prev ? formatDateHeader(prev.createdAt) : null;
                  const showDateSeparator = !prev || prevDateLabel !== dateLabel;

                  const isFirstOfGroup = showDateSeparator || prev?.expediteur !== msg.expediteur;
                  const isLastOfGroup = !next || next.expediteur !== msg.expediteur || formatDateHeader(next.createdAt) !== dateLabel;

                  return (
                    <React.Fragment key={msg.id || `msg-${index}`}>
                      {showDateSeparator && (
                        <div className="flex items-center justify-center my-4">
                          <span className="px-3 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold shadow-2xs">
                            {dateLabel}
                          </span>
                        </div>
                      )}

                      <div className={`flex ${isAdmin ? "justify-end" : "justify-start"} ${isFirstOfGroup ? "mt-3" : "mt-0.5"}`}>
                        {!isAdmin && (
                          isLastOfGroup ? (
                            <div className="w-8 h-8 rounded-full bg-[#0a2d26]/10 dark:bg-emerald-500/20 flex items-center justify-center text-[#0a2d26] dark:text-emerald-400 font-bold text-xs shrink-0 mr-2 self-end">
                              {activeConversation.nom ? activeConversation.nom.charAt(0).toUpperCase() : "U"}
                            </div>
                          ) : (
                            <div className="w-8 mr-2 shrink-0" aria-hidden />
                          )
                        )}

                        <div className="max-w-[75%]">
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isAdmin
                                ? `bg-[#0a2d26] dark:bg-emerald-700 text-white ${isLastOfGroup ? "rounded-br-xs" : ""}`
                                : `bg-white dark:bg-[#1b2936] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-xs ${isLastOfGroup ? "rounded-bl-xs" : ""}`
                            }`}
                          >
                            {msg.type === "audio" || msg.audioUrl ? (
                              <div className="flex flex-col gap-1.5 py-1 min-w-[220px]">
                                <div className="flex items-center justify-between text-xs font-semibold opacity-90">
                                  <span className="flex items-center gap-1.5">
                                    <Volume2 className="w-4 h-4" /> Message vocal
                                  </span>
                                  {msg.dureeSeconds && (
                                    <span className="text-[11px] opacity-75">{msg.dureeSeconds}s</span>
                                  )}
                                </div>
                                <audio controls src={msg.audioUrl || msg.contenu} className="w-full h-9 rounded-md mt-1" />
                              </div>
                            ) : msg.type === "fichier" || msg.type === "image" ? (
                              <div className="flex flex-col gap-1">
                                {msg.type === "image" || (msg.audioUrl && (msg.audioUrl.endsWith(".png") || msg.audioUrl.endsWith(".jpg") || msg.audioUrl.endsWith(".jpeg") || msg.audioUrl.endsWith(".webp"))) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={msg.audioUrl || msg.contenu}
                                    alt="Pièce jointe"
                                    className="max-h-60 rounded-lg object-cover mb-1 border border-black/10"
                                  />
                                ) : null}
                                <a
                                  href={msg.audioUrl || msg.contenu}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border ${
                                    isAdmin
                                      ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                                      : "bg-slate-50 dark:bg-[#233544] border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                                  }`}
                                >
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <span className="truncate flex-1">{msg.contenu}</span>
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                </a>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{msg.contenu}</p>
                            )}
                          </div>

                          {isLastOfGroup && (
                            <div className={`flex items-center gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-500 ${isAdmin ? "justify-end" : "justify-start"}`}>
                              {formatTime(msg.createdAt)}
                              {isAdmin && (
                                <CheckCheck className={`w-3 h-3 ${msg.lu ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400"}`} />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone de saisie */}
            <div className="p-4 bg-white dark:bg-[#111c24] border-t border-slate-200 dark:border-slate-800 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,audio/*,application/pdf,.doc,.docx,.zip"
              />

              {isRecording ? (
                /* Mode enregistrement vocal en cours */
                <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 rounded-xl">
                  <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 font-medium text-sm">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
                    </span>
                    <span className="font-semibold">Enregistrement...</span>
                    <span className="font-mono font-bold text-red-700 dark:text-red-300 ml-1 text-base">
                      {formatDuration(recordingSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      title="Annuler l'enregistrement"
                      className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-red-100/60 dark:hover:bg-red-900/40 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      title="Terminer l'enregistrement"
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Terminer</span>
                    </button>
                  </div>
                </div>
              ) : audioPreviewUrl ? (
                /* Mode prévisualisation du vocal avant envoi */
                <div className="flex items-center justify-between gap-3 bg-slate-100 dark:bg-[#15222e] border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={togglePlayPreview}
                      className="p-2.5 bg-[#0a2d26] dark:bg-emerald-600 text-white rounded-full hover:bg-[#124b40] dark:hover:bg-emerald-500 transition-colors shrink-0 shadow-xs"
                    >
                      {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Message vocal prêt ({formatDuration(recordingSeconds)})
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Cliquez sur Play pour réécouter ou sur Envoyer
                      </span>
                      <audio
                        ref={previewAudioRef}
                        src={audioPreviewUrl}
                        onEnded={() => setIsPreviewPlaying(false)}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      disabled={sending}
                      title="Supprimer le vocal"
                      className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSendVoiceMessage}
                      disabled={sending}
                      className="px-4 py-2 bg-[#0a2d26] dark:bg-emerald-600 text-white rounded-lg hover:bg-[#124b40] dark:hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-2 text-xs font-semibold shadow-xs"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Envoyer</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode de saisie texte classique + Micro */
                <div className="flex items-end gap-2 bg-slate-50 dark:bg-[#15222e] border border-slate-200 dark:border-slate-700 p-2 rounded-xl focus-within:ring-2 focus-within:ring-[#0a2d26]/20 focus-within:border-[#0a2d26] dark:focus-within:ring-emerald-500/20 dark:focus-within:border-emerald-500 transition-all">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || sending}
                    title="Joindre un fichier"
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg shrink-0 transition-colors disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin text-[#0a2d26] dark:text-emerald-400" /> : <Paperclip className="w-5 h-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={uploading || sending}
                    title="Enregistrer un message vocal"
                    className="p-2 text-slate-400 hover:text-[#0a2d26] dark:hover:text-emerald-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg shrink-0 transition-colors disabled:opacity-50"
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Tapez votre réponse ici..."
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[40px] text-sm py-2 px-1 outline-none text-slate-800 dark:text-slate-100"
                    rows={1}
                  />

                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending || uploading}
                    className="p-2.5 bg-[#0a2d26] dark:bg-emerald-600 text-white rounded-lg hover:bg-[#124b40] dark:hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              )}
              <div className="text-center mt-2">
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {isRecording
                    ? "Enregistrement vocal actif — cliquez sur Terminer pour valider"
                    : audioPreviewUrl
                    ? "Prévisualisation du vocal — cliquez sur Envoyer"
                    : "Entrée pour envoyer • Maj + Entrée pour retour à la ligne"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-[#0b1319] p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-[#15222e] flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Aucune conversation sélectionnée</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Sélectionnez une conversation dans la liste à gauche pour consulter les messages et répondre à l&apos;étudiant.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
