"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CandidateUser,
  exchangeOneTimeToken,
  completerProfilCandidat,
} from "./api";

const AUTH_KEY = "sahel_verif_candidate";
const EVENT_AUTH = "sahel-auth-change";

/** Messages d'erreur renvoyés par le pont OAuth (fragment `erreur=...`). */
const ERREURS_OAUTH: Record<string, string> = {
  google_indisponible: "La connexion Google est momentanément indisponible.",
  session_absente: "La session Google n'a pas pu être créée.",
  echange_impossible: "La connexion Google a échoué. Réessayez.",
};

// Garde-fou global : le jeton à usage unique reçu de Google ne doit être
// échangé qu'une seule fois, même si plusieurs composants utilisent ce hook.
let ottEnCours = false;

function lireUser(): CandidateUser | null {
  try {
    const brut = localStorage.getItem(AUTH_KEY);
    return brut ? (JSON.parse(brut) as CandidateUser) : null;
  } catch {
    return null;
  }
}

function ecrireUser(u: CandidateUser | null) {
  try {
    if (u) localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    else localStorage.removeItem(AUTH_KEY);
  } catch {
    // Ignore
  }
  // Prévient toutes les instances de ce hook (barre de session, page…).
  try {
    window.dispatchEvent(new Event(EVENT_AUTH));
  } catch {
    // Ignore
  }
}

export function useAuth() {
  const [user, setUser] = useState<CandidateUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const saveUser = useCallback((u: CandidateUser) => {
    setUser(u);
    ecrireUser(u);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    ecrireUser(null);
  }, []);

  // Synchronisation entre instances (et entre onglets) : toute connexion ou
  // déconnexion faite ailleurs se répercute ici.
  useEffect(() => {
    const resync = () => setUser(lireUser());
    window.addEventListener(EVENT_AUTH, resync);
    window.addEventListener("storage", resync);
    return () => {
      window.removeEventListener(EVENT_AUTH, resync);
      window.removeEventListener("storage", resync);
    };
  }, []);

  // Chargement initial + prise en charge du retour Google (#ott / #erreur).
  useEffect(() => {
    setUser(lireUser());

    const hash =
      typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    const ott = params.get("ott");
    const erreur = params.get("erreur");

    const nettoyerUrl = () => {
      try {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
      } catch {
        // Ignore
      }
    };

    if (erreur) {
      setAuthError(ERREURS_OAUTH[erreur] || "Connexion impossible.");
      nettoyerUrl();
      setLoading(false);
      return;
    }

    if (ott && !ottEnCours) {
      ottEnCours = true;
      nettoyerUrl();
      exchangeOneTimeToken(ott)
        .then(({ user: u }) => saveUser(u))
        .catch((e) =>
          setAuthError(e instanceof Error ? e.message : "Connexion impossible.")
        )
        .finally(() => {
          ottEnCours = false;
          setLoading(false);
        });
      return;
    }

    setLoading(false);
  }, [saveUser]);

  /** Le profil doit être complété tant qu'aucun téléphone n'est enregistré. */
  const besoinCompletion = !!user && !user.telephone;

  const completerProfil = useCallback(
    async (telephone: string, nom?: string) => {
      const actuel = lireUser();
      if (!actuel) return;
      const misAJour = await completerProfilCandidat(actuel, { telephone, nom });
      saveUser(misAJour);
    },
    [saveUser]
  );

  return {
    user,
    loading,
    authError,
    setAuthError,
    besoinCompletion,
    saveUser,
    logout,
    completerProfil,
  };
}
