// Côté SERVEUR (rendu dans le conteneur web) : on joint le backend EN INTERNE
// par son nom de conteneur via INTERNAL_API_URL (pas besoin d'Internet ni du
// DNS public — indispensable car le web n'a pas d'egress Internet).
// Côté NAVIGATEUR : on utilise l'URL publique NEXT_PUBLIC_API_URL.
const API_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3001/api/v1"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export interface Bourse {
  id: string;
  titre: string;
  description?: string;
  imageUrl?: string;
  datePublication: string;
  dateLimite: string;
  statut: string;
  documentAdmissionUrl?: string;
  documentAdmissionNom?: string;
  messageAdmission?: string;
  champs?: Champ[];
}

export interface Champ {
  id: string;
  label: string;
  type: "texte" | "paragraphe" | "email" | "telephone" | "nombre" | "choix" | "lien";
  obligatoire: boolean;
  options: string[];
  aide?: string;
  cle?: string;
  ordre: number;
}

export interface CandidateUser {
  id: string;
  nom: string;
  email: string;
  telephone?: string;
  token?: string;
}

export async function fetchBourses(): Promise<Bourse[]> {
  try {
    const res = await fetch(`${API_URL}/bourses`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Erreur lors de la récupération des bourses");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("fetchBourses error:", err);
    return [];
  }
}

export async function fetchBourseById(id: string): Promise<Bourse | null> {
  try {
    const res = await fetch(`${API_URL}/bourses/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("fetchBourseById error:", err);
    return null;
  }
}

export async function signInCandidate(email: string, password: string): Promise<{ user: CandidateUser; token?: string }> {
  const res = await fetch(`${API_URL}/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.body?.message || "Erreur de connexion");
  }

  const user = data.user || data;
  const token = data.session?.token || data.token || user.token;

  return {
    user: {
      id: user.id,
      nom: user.name || user.nom,
      email: user.email,
      telephone: user.telephone,
      token,
    },
    token,
  };
}

export async function signUpCandidate(
  nom: string,
  email: string,
  password: string,
  telephone?: string
): Promise<{ user: CandidateUser; token?: string }> {
  const res = await fetch(`${API_URL}/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nom, nom, email, password, telephone }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.body?.message || "Erreur d'inscription");
  }

  const user = data.user || data;
  const token = data.session?.token || data.token || user.token;

  return {
    user: {
      id: user.id,
      nom: user.name || user.nom || nom,
      email: user.email,
      telephone: user.telephone || telephone,
      token,
    },
    token,
  };
}

/**
 * URL de démarrage de la connexion Google (pont OAuth web du backend).
 * À ouvrir en navigation de premier niveau : `window.location.assign(...)`.
 * Le backend renvoie ensuite le navigateur vers [redirect]#ott=<jeton>.
 */
export function googleStartUrl(redirect: string): string {
  return `${API_URL}/oauth/google/start?redirect=${encodeURIComponent(redirect)}`;
}

/**
 * Échange le jeton à usage unique (reçu dans l'URL après Google) contre une
 * session : renvoie le candidat et son token bearer (en-tête set-auth-token).
 */
export async function exchangeOneTimeToken(
  ott: string
): Promise<{ user: CandidateUser; token?: string }> {
  const res = await fetch(`${API_URL}/auth/one-time-token/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: ott }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Connexion Google impossible.");
  }

  const user = data.user || data;
  const token =
    res.headers.get("set-auth-token") ||
    data.session?.token ||
    data.token ||
    user.token;

  return {
    user: {
      id: user.id,
      nom: user.name || user.nom || "",
      email: user.email,
      telephone: user.telephone,
      token,
    },
    token,
  };
}

/**
 * Complète le profil du candidat connecté (téléphone, et nom si manquant).
 */
export async function completerProfilCandidat(
  user: CandidateUser,
  data: { telephone: string; nom?: string }
): Promise<CandidateUser> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (user.token) headers["Authorization"] = `Bearer ${user.token}`;

  const payload: Record<string, string> = { telephone: data.telephone.trim() };
  if (data.nom && data.nom.trim()) payload.name = data.nom.trim();

  const res = await fetch(`${API_URL}/users/me`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || "Impossible d'enregistrer votre profil.");
  }

  return {
    ...user,
    nom: body.name || body.nom || data.nom || user.nom,
    telephone: body.telephone || data.telephone,
  };
}

export async function postulerBourse(
  bourseId: string,
  user: CandidateUser,
  reponses: Record<string, unknown>
): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (user.token) {
    headers["Authorization"] = `Bearer ${user.token}`;
  }

  const res = await fetch(`${API_URL}/bourses/${bourseId}/candidatures`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({
      userId: user.id,
      nom: user.nom,
      email: user.email,
      reponses,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Erreur lors de l'envoi de la candidature");
  }

  return data;
}

export interface CandidatureItem {
  id: string;
  bourseId: string;
  userId: string;
  nom: string;
  email?: string;
  statut: "admis" | "en_attente" | "refuse" | string;
  dateDepot?: string;
  createdAt?: string;
  reponses?: Record<string, any>;
  bourse?: {
    id: string;
    titre: string;
    description?: string;
    imageUrl?: string;
    statut: string;
    dateLimite?: string;
    messageAdmission?: string;
    documentAdmissionUrl?: string;
    documentAdmissionNom?: string;
    formation?: {
      id: string;
      titre: string;
    };
  };
}

/**
 * Récupère l'ensemble des candidatures de l'utilisateur connecté (comme dans l'app mobile).
 */
export async function fetchMesCandidatures(
  user: CandidateUser
): Promise<CandidatureItem[]> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (user.token) {
      headers["Authorization"] = `Bearer ${user.token}`;
    }

    const res = await fetch(`${API_URL}/bourses/candidatures/me`, {
      headers,
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 401) return [];
      throw new Error("Impossible de récupérer vos candidatures");
    }
    const data = await res.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (err) {
    console.error("fetchMesCandidatures error:", err);
    return [];
  }
}

// ─────────────────────────────────────────
// FORMATIONS (cours) — listing + inscription
// ─────────────────────────────────────────

export interface Departement {
  id: string;
  nom: string;
  description?: string;
}

export interface Formateur {
  id: string;
  nom: string;
  specialite?: string;
}

export interface Formation {
  id: string;
  titre: string;
  description?: string;
  departementId: string;
  formateurId?: string | null;
  prixInscription: number;
  prixMensualite: number;
  dureeMois: number;
  niveau?: string | null;
  estBourse: boolean;
  imageUrl?: string | null;
  statut: "active" | "inactive" | "archive";
  datePublication?: string | null;
  dateLimite?: string | null;
  departement?: Departement | null;
  formateur?: Formateur | null;
  _count?: { inscriptions: number; demandesInscriptions: number };
}

export interface DemandeInscription {
  id: string;
  formationId: string;
  statut: "en_attente" | "valide" | "refuse";
  createdAt: string;
  /** Date du dernier changement de statut (validation, refus, resoumission). */
  updatedAt?: string;
  formation?: Formation;
}

/** Formations ouvertes au public (statut « active » uniquement). */
export async function fetchFormations(): Promise<Formation[]> {
  try {
    const res = await fetch(`${API_URL}/formations?statut=active`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Erreur lors de la récupération des formations");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("fetchFormations error:", err);
    return [];
  }
}

export async function fetchFormationById(id: string): Promise<Formation | null> {
  try {
    const res = await fetch(`${API_URL}/formations/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("fetchFormationById error:", err);
    return null;
  }
}

function authHeaders(user: CandidateUser): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (user.token) headers["Authorization"] = `Bearer ${user.token}`;
  return headers;
}

/**
 * Demande d'inscription à un cours. Le backend crée la demande en « en_attente »
 * et ouvre automatiquement un fil support ; l'admin valide ensuite depuis le
 * back-office, ce qui inscrit réellement l'élève et le notifie.
 */
export async function demanderInscription(
  formationId: string,
  user: CandidateUser
): Promise<DemandeInscription> {
  const res = await fetch(`${API_URL}/formations/${formationId}/demande`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify({}),
  });

  const data = await res.json();

  if (!res.ok) {
    // Une session expirée renvoie « Non authentifié », message illisible pour
    // l'élève : on lui dit quoi faire plutôt que ce que le serveur a répondu.
    if (res.status === 401) {
      throw new Error(
        "Votre session a expiré. Veuillez vous reconnecter pour envoyer votre demande."
      );
    }
    throw new Error(
      data.message || "Erreur lors de l'envoi de votre demande d'inscription"
    );
  }

  return data;
}

/** Demandes d'inscription déjà envoyées par le candidat connecté. */
export async function fetchMesDemandes(
  user: CandidateUser
): Promise<DemandeInscription[]> {
  try {
    const res = await fetch(`${API_URL}/formations/demandes/me`, {
      headers: authHeaders(user),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("fetchMesDemandes error:", err);
    return [];
  }
}
