"use client";

import { useState } from "react";
import {
  CandidateUser,
  signInCandidate,
  signUpCandidate,
  googleStartUrl,
} from "@/lib/api";
import {
  AlertCircle,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Phone,
  User,
  UserCheck,
  UserPlus,
} from "lucide-react";

interface CandidateAuthPanelProps {
  /** Titre du bandeau, ex. « Veuillez vous connecter ou créer un compte ». */
  titre: string;
  /** Phrase expliquant à quoi sert la connexion sur cette page. */
  sousTitre: string;
  /** Libellé du bouton une fois le mode choisi (connexion / inscription). */
  labelConnexion: string;
  labelInscription: string;
  onAuthenticated: (user: CandidateUser) => void;
}

/**
 * Carte d'authentification affichée à la place du formulaire tant que le
 * candidat n'est pas identifié. Partagée par les pages bourse et formation.
 */
export function CandidateAuthPanel({
  titre,
  sousTitre,
  labelConnexion,
  labelInscription,
  onAuthenticated,
}: CandidateAuthPanelProps) {
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telephone, setTelephone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authTab === "signin") {
        if (!email || !password) {
          throw new Error("Veuillez remplir votre email et mot de passe.");
        }
        const res = await signInCandidate(email, password);
        onAuthenticated(res.user);
      } else {
        if (!nom || !email || !password) {
          throw new Error("Veuillez remplir votre nom, email et mot de passe.");
        }
        if (password.length < 6) {
          throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
        }
        const res = await signUpCandidate(nom, email, password, telephone);
        onAuthenticated(res.user);
      }
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'authentification"
      );
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-5 pt-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{titre}</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">{sousTitre}</p>
      </div>

      <div className="flex gap-1 mx-5 mt-4 p-1 rounded-xl bg-slate-100">
        <button
          type="button"
          onClick={() => {
            setAuthTab("signin");
            setAuthError(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            authTab === "signin"
              ? "bg-white text-emerald-950 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Se connecter
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthTab("signup");
            setAuthError(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            authTab === "signup"
              ? "bg-white text-emerald-950 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Créer un compte
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        {authError && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Connexion / inscription avec Google (une seule et même action) */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.assign(googleStartUrl(window.location.href));
            }
          }}
          className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
          </svg>
          <span>Continuer avec Google</span>
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-semibold text-slate-400">ou par e-mail</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {authTab === "signup" && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder="ex: Fatou Sow"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Adresse email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              required
              placeholder="votre.email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>
        </div>

        {authTab === "signup" && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Numéro de téléphone{" "}
              <span className="text-slate-400 font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                placeholder="+221 77 000 00 00"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Mot de passe <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={authLoading}
          className="w-full py-3.5 px-4 bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
        >
          {authLoading ? (
            <span>Vérification...</span>
          ) : authTab === "signin" ? (
            <>
              <LogIn className="w-4 h-4" />
              <span>{labelConnexion}</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>{labelInscription}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

interface CandidateBadgeProps {
  user: CandidateUser;
  onLogout: () => void;
}

/** Bandeau « connecté en tant que … » avec bouton de déconnexion. */
export function CandidateBadge({ user, onLogout }: CandidateBadgeProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
          {user.nom ? user.nom.charAt(0).toUpperCase() : "U"}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-emerald-950">{user.nom}</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xs text-emerald-700">{user.email}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
        title="Se déconnecter"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ProfilCompletionCardProps {
  user: CandidateUser;
  /** Enregistre le profil ; lève une erreur en cas d'échec. */
  onSubmit: (telephone: string, nom?: string) => Promise<void>;
}

/**
 * Complétion de profil après une connexion Google : on récupère le numéro de
 * téléphone (indispensable pour recontacter le candidat) et, si Google ne l'a
 * pas fourni, le nom complet.
 */
export function ProfilCompletionCard({ user, onSubmit }: ProfilCompletionCardProps) {
  const nomManquant = !user.nom || user.nom.trim().length < 2;
  const [nom, setNom] = useState(user.nom || "");
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (nomManquant && nom.trim().length < 2) {
      setError("Veuillez indiquer votre nom complet.");
      return;
    }
    if (telephone.trim().length < 8) {
      setError("Veuillez indiquer un numéro de téléphone valide.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit(telephone, nomManquant ? nom : undefined);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible d'enregistrer le profil."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-5 pt-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Complétez votre profil</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Bienvenue {user.nom || user.email} ! Encore une étape avant de continuer.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {nomManquant && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder="ex: Fatou Sow"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Numéro de téléphone <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="tel"
              required
              placeholder="+221 77 000 00 00"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
        >
          {loading ? <span>Enregistrement...</span> : <span>Continuer</span>}
        </button>
      </form>
    </div>
  );
}
