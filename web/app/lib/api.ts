// ─── Couche d'accès à l'API backend (NestJS) ───
// Toutes les requêtes envoient le cookie de session (better-auth) via credentials: "include".

export const BASE = process.env.NEXT_PUBLIC_API_URL
  ?? (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("NEXT_PUBLIC_API_URL manquant en production"); })()
    : "http://localhost:3001/api/v1");

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      message = (body?.message && (Array.isArray(body.message) ? body.message.join(", ") : body.message)) || message;
    } catch {
      /* corps non-JSON */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(p: string, body?: unknown) => request<T>(p, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T>(p: string) => request<T>(p, { method: "DELETE" }),
};

export const uploadApi = async (file: File, type?: string): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  if (type) formData.append("type", type);

  const endpoint = type ? `${BASE}/upload?type=${encodeURIComponent(type)}` : `${BASE}/upload`;
  const res = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw new ApiError(res.status, "Upload failed");
  return res.json();
};

// ─── Helpers par ressource (alignés sur les contrôleurs backend) ───

export const usersApi = {
  list: () => api.get<any[]>("/users"),
  get: (id: string) => api.get<any>(`/users/${id}`),
  create: (data: unknown) => api.post<any>("/users", data),
  update: (id: string, data: unknown) => api.patch<any>(`/users/${id}`, data),
  setPassword: (id: string, newPassword: string) =>
    api.patch<{ success: boolean }>(`/users/${id}/password`, { newPassword }),
  remove: (id: string) => api.del(`/users/${id}`),
  inscriptions: (id: string) => api.get<any[]>(`/users/${id}/inscriptions`),
  enroll: (id: string, data: { formationId: string }) => api.post<any>(`/users/${id}/inscriptions`, data),
  updateInscriptionStatus: (userId: string, formationId: string, statut: string) =>
    api.patch<any>(`/users/${userId}/inscriptions/${formationId}`, { statut }),
  removeInscription: (userId: string, formationId: string) =>
    api.del(`/users/${userId}/inscriptions/${formationId}`),
  candidatures: (id: string) => api.get<any[]>(`/users/${id}/candidatures`),
};

export const departementsApi = {
  list: () => api.get<any[]>("/departements"),
  create: (data: unknown) => api.post<any>("/departements", data),
  update: (id: string, data: unknown) => api.patch<any>(`/departements/${id}`, data),
  remove: (id: string) => api.del(`/departements/${id}`),
};

export const centresApi = {
  list: () => api.get<any[]>("/centres"),
  create: (data: unknown) => api.post<any>("/centres", data),
  update: (id: string, data: unknown) => api.patch<any>(`/centres/${id}`, data),
  remove: (id: string) => api.del(`/centres/${id}`),
  addCreneau: (id: string, data: unknown) => api.post<any>(`/centres/${id}/creneaux`, data),
  removeCreneau: (id: string, creneauId: string) => api.del(`/centres/${id}/creneaux/${creneauId}`),
};

export const formationsApi = {
  list: () => api.get<any[]>("/formations"),
  get: (id: string) => api.get<any>(`/formations/${id}`),
  create: (data: unknown) => api.post<any>("/formations", data),
  update: (id: string, data: unknown) => api.patch<any>(`/formations/${id}`, data),
  remove: (id: string) => api.del(`/formations/${id}`),
};

export const formateursApi = {
  /** Crée le compte de connexion d'un formateur (rôle FORMATEUR imposé côté API). */
  creerCompte: (data: { nom: string; email: string; motDePasse: string; telephone?: string }) =>
    api.post<{ id: string; nom: string; email: string; role: string }>("/formateurs/compte", data),
  list: () => api.get<any[]>("/formateurs"),
  get: (id: string) => api.get<any>(`/formateurs/${id}`),
  getGains: (id: string) => api.get<any>(`/formateurs/${id}/gains`),
  create: (data: unknown) => api.post<any>("/formateurs", data),
  update: (id: string, data: unknown) => api.patch<any>(`/formateurs/${id}`, data),
  remove: (id: string) => api.del(`/formateurs/${id}`),
  salaires: (id: string) => api.get<any[]>(`/formateurs/${id}/salaires`),
  createFiche: (id: string, data: unknown) => api.post<any>(`/formateurs/${id}/salaires`, data),
  updateFiche: (ficheId: string, data: unknown) => api.patch<any>(`/formateurs/salaires/${ficheId}`, data),
  removeFiche: (ficheId: string) => api.del(`/formateurs/salaires/${ficheId}`),
  addVersement: (ficheId: string, data: unknown) => api.post<any>(`/formateurs/salaires/${ficheId}/versements`, data),
  removeVersement: (ficheId: string, vId: string) => api.del(`/formateurs/salaires/${ficheId}/versements/${vId}`),
};

export const boursesApi = {
  list: () => api.get<any[]>("/bourses?all=true"),
  get: (id: string) => api.get<any>(`/bourses/${id}`),
  create: (data: unknown) => api.post<any>("/bourses", data),
  update: (id: string, data: unknown) => api.patch<any>(`/bourses/${id}`, data),
  remove: (id: string) => api.del(`/bourses/${id}`),
  addChamp: (id: string, data: unknown) => api.post<any>(`/bourses/${id}/champs`, data),
  removeChamp: (id: string, champId: string) => api.del(`/bourses/${id}/champs/${champId}`),
  candidatures: (id: string) => api.get<any[]>(`/bourses/${id}/candidatures`),
  updateCandidature: (candidatureId: string, data: unknown) => api.patch<any>(`/bourses/candidatures/${candidatureId}`, data),
};

export const paiementsApi = {
  list: (params?: { userId?: string; formationId?: string }) => {
    const q = new URLSearchParams();
    if (params?.userId) q.set("userId", params.userId);
    if (params?.formationId) q.set("formationId", params.formationId);
    const qs = q.toString();
    return api.get<any[]>(`/paiements${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => api.get<any>(`/paiements/${id}`),
  createEcheance: (data: unknown) => api.post<any>("/paiements", data),
  addPaiement: (id: string, data: unknown) => api.post<any>(`/paiements/${id}/historique`, data),
  updatePaiement: (hId: string, data: unknown) => api.patch<any>(`/paiements/historique/${hId}`, data),
  removePaiement: (id: string, hId: string) => api.del(`/paiements/${id}/historique/${hId}`),
};

export const actualitesApi = {
  list: () => api.get<any[]>("/actualites"),
  get: (id: string) => api.get<any>(`/actualites/${id}`),
  create: (data: unknown) => api.post<any>("/actualites", data),
  update: (id: string, data: unknown) => api.patch<any>(`/actualites/${id}`, data),
  remove: (id: string) => api.del(`/actualites/${id}`),
  like: (id: string) => api.post<any>(`/actualites/${id}/like`),
  addCommentaire: (id: string, data: unknown) => api.post<any>(`/actualites/${id}/commentaires`, data),
  removeCommentaire: (id: string, cId: string) => api.del(`/actualites/${id}/commentaires/${cId}`),
};

export const notificationsApi = {
  list: () => api.get<any[]>("/notifications"),
  listAdmin: () => api.get<any[]>("/notifications/admin"),
  create: (data: unknown) => api.post<any>("/notifications", data),
  markRead: (id: string) => api.patch<any>(`/notifications/${id}/read`),
  /** Suppression définitive, pour tous les destinataires. */
  remove: (id: string) => api.del(`/notifications/admin/${id}`),
};

export const supportApi = {
  getConversations: () => api.get<any[]>("/support/conversations"),
  getConversation: (userId: string) => api.get<any[]>(`/support/conversations/${userId}`),
  sendMessage: (userId: string, data: { contenu: string; type?: string; audioUrl?: string; dureeSeconds?: number }) =>
    api.post<any>(`/support/conversations/${userId}/messages`, data),
};

export const demandesApi = {
  list: () => api.get<any[]>("/formations/demandes/all"),
  creer: (formationId: string) => api.post<any>(`/formations/${formationId}/demande`),
  valider: (demandeId: string) => api.patch<any>(`/formations/demandes/${demandeId}/valider`),
  refuser: (demandeId: string) => api.patch<any>(`/formations/demandes/${demandeId}/refuser`),
};

export const classesApi = {
  getMessages: (formationId: string) => api.get<any[]>(`/classes/${formationId}/messages`),
  createMessage: (formationId: string, data: any) => api.post<any>(`/classes/${formationId}/messages`, data),
  removeMessage: (id: string) => api.del(`/classes/messages/${id}`),
  getDocuments: (formationId: string) => api.get<any[]>(`/classes/${formationId}/documents`),
  createDocument: (formationId: string, data: any) => api.post<any>(`/classes/${formationId}/documents`, data),
  removeDocument: (id: string) => api.del(`/classes/documents/${id}`),
};

export const rolesApi = {
  list: () => api.get<any[]>("/roles"),
  getPermissionsMatrix: () => api.get<any>("/roles/permissions"),
  createRole: (data: unknown) => api.post<any>("/roles", data),
  updateRole: (id: string, data: unknown) => api.patch<any>(`/roles/${id}`, data),
  assignUserRole: (userId: string, role: string) => api.patch<any>(`/users/${userId}`, { role }),
};

// ─── Journal d'audit (SUPER_ADMIN uniquement) ───

export type ActionAudit =
  | "CREATION"
  | "MODIFICATION"
  | "SUPPRESSION"
  | "CONNEXION"
  | "ATTRIBUTION_ROLE";

export interface AuditLog {
  id: string;
  userId: string | null;
  userNom: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: ActionAudit;
  ressource: string;
  ressourceId: string | null;
  libelle: string | null;
  methode: string;
  route: string;
  statut: number;
  succes: boolean;
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditFiltres {
  page?: number;
  limite?: number;
  userId?: string;
  action?: ActionAudit;
  ressource?: string;
  succes?: "true" | "false";
  du?: string;
  au?: string;
  recherche?: string;
}

export const auditApi = {
  list: (filtres: AuditFiltres) => {
    const params = new URLSearchParams();
    for (const [cle, valeur] of Object.entries(filtres)) {
      if (valeur !== undefined && valeur !== "") params.set(cle, String(valeur));
    }
    return api.get<{
      items: AuditLog[];
      total: number;
      page: number;
      limite: number;
      pages: number;
    }>(`/audit-logs?${params.toString()}`);
  },
  filtres: () =>
    api.get<{
      ressources: string[];
      utilisateurs: { id: string; nom: string | null; email: string | null; role: string | null }[];
    }>("/audit-logs/filtres"),
  resume: () =>
    api.get<{ actions: number; suppressions: number; echecs: number; connexions: number }>(
      "/audit-logs/resume"
    ),
};


