"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient, useSession } from "@/app/lib/auth-client";
import { isStaffOrAdminRole } from "@/app/lib/permissions";
import { ArrowLeft, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: session, isPending: sessionLoading } = useSession();

  // Si déjà connecté, rediriger selon le rôle
  useEffect(() => {
    if (!sessionLoading && session?.user) {
      const role = (session.user as { role?: string })?.role;
      if (isStaffOrAdminRole(role)) {
        if (from && from.startsWith("/dashboard")) {
          router.replace(from);
        } else {
          router.replace("/dashboard");
        }
      } else {
        if (from && !from.startsWith("/dashboard")) {
          router.replace(from);
        } else {
          router.replace("/");
        }
      }
    }
  }, [session, sessionLoading, from, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let loggedUserRole: string | undefined;

      if (mode === "login") {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message || "Identifiants invalides");
        loggedUserRole = (res.data?.user as { role?: string } | undefined)?.role;
      } else {
        const res = await authClient.signUp.email({ email, password, name: nom });
        if (res.error) throw new Error(res.error.message || "Inscription impossible");
        loggedUserRole = (res.data?.user as { role?: string } | undefined)?.role;
      }

      // Si le rôle n'est pas directement présent dans la réponse, on relit la session
      if (!loggedUserRole) {
        const sess = await authClient.getSession();
        loggedUserRole = (sess.data?.user as { role?: string } | undefined)?.role;
      }

      // Redirection selon le rôle
      if (isStaffOrAdminRole(loggedUserRole)) {
        if (from && from.startsWith("/dashboard")) {
          router.push(from);
        } else {
          router.push("/dashboard");
        }
      } else {
        if (from && !from.startsWith("/dashboard")) {
          router.push(from);
        } else {
          router.push("/");
        }
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "var(--bg-body, #f8fafc)",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 420, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Logo Sahel 250x70-01.png"
            alt="Sahel Academy"
            style={{ height: 44, objectFit: "contain", margin: "0 auto 8px" }}
          />
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Plateforme Sahel Academy
          </div>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
          {mode === "login"
            ? "Accédez à votre espace selon votre profil (Administration ou Candidat)."
            : "Créez votre compte pour postuler et suivre vos candidatures."}
        </p>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={submit} className="grid gap-4">
          {mode === "signup" && (
            <div className="form-group">
              <label className="form-label">Nom complet</label>
              <input
                className="form-input"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                placeholder="Ex. Daouda Sao"
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre-email@exemple.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading
              ? "Veuillez patienter..."
              : mode === "login"
              ? "Se connecter"
              : "Créer mon compte"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: 16,
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          {mode === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <button
                type="button"
                className="hover:underline cursor-pointer"
                style={{ color: "var(--accent-primary)", fontWeight: 600 }}
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
              >
                Créer un compte
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <button
                type="button"
                className="hover:underline cursor-pointer"
                style={{ color: "var(--accent-primary)", fontWeight: 600 }}
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                Se connecter
              </button>
            </>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour au portail public</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500">
          Chargement...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
