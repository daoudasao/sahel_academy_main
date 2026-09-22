"use client";

import { useState } from "react";
import { signInCandidate, signUpCandidate, CandidateUser } from "@/lib/api";
import { User, Lock, Mail, Phone, X, LogIn, UserPlus, AlertCircle } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: CandidateUser) => void;
  initialMode?: "signin" | "signup";
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "signin",
}: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telephone, setTelephone] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        if (!email || !password) {
          throw new Error("Veuillez remplir tous les champs obligatoires.");
        }
        const res = await signInCandidate(email, password);
        onSuccess(res.user);
        onClose();
      } else {
        if (!nom || !email || !password) {
          throw new Error("Veuillez remplir votre nom, email et mot de passe.");
        }
        if (password.length < 6) {
          throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
        }
        const res = await signUpCandidate(nom, email, password, telephone);
        onSuccess(res.user);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-[#0a2d26] to-[#124b40] p-6 text-white text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-emerald-200 hover:text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-400/30">
            {mode === "signin" ? <LogIn className="w-6 h-6 text-emerald-300" /> : <UserPlus className="w-6 h-6 text-emerald-300" />}
          </div>

          <h3 className="text-xl font-bold">
            {mode === "signin" ? "Connexion requise" : "Créer votre compte candidat"}
          </h3>
          <p className="text-xs text-emerald-100/80 mt-1">
            {mode === "signin"
              ? "Connectez-vous pour continuer et postuler à la bourse."
              : "Créez votre compte pour poser votre candidature rapidement."}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              mode === "signin"
                ? "bg-white text-emerald-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              mode === "signup"
                ? "bg-white text-emerald-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Créer un compte
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {mode === "signup" && (
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

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Numéro de téléphone <span className="text-slate-400 font-normal">(optionnel)</span>
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
            disabled={loading}
            className="w-full py-3 px-4 bg-[#0a2d26] hover:bg-[#0d3b32] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Traitement en cours...</span>
            ) : mode === "signin" ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Se connecter et continuer</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Créer mon compte et postuler</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
