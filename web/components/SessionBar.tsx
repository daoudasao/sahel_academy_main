"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/app/lib/auth-client";
import { isStaffOrAdminRole } from "@/app/lib/permissions";
import { effacerCandidatLocal } from "@/lib/useAuth";
import { LogOut, LayoutDashboard, LogIn, User, ClipboardList } from "lucide-react";

/**
 * Barre de session globale : affichée en haut à droite sur les pages publiques.
 * Permet aux candidats de voir leur statut/déconnexion, et aux administrateurs
 * de basculer instantanément vers le Tableau de bord.
 */
export default function SessionBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // On masque la barre flottante sur les écrans d'administration et la page de login
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/login")) {
    return null;
  }

  if (isPending) return null;

  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role;
  const isAdmin = isStaffOrAdminRole(role);
  const nom = user?.name?.trim() || user?.email || "";

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-3 py-1.5 shadow-md">
      {pathname !== "/candidatures" && (
        <Link
          href="/candidatures"
          className="flex items-center gap-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 text-xs font-bold transition-all"
          title="Consulter mes candidatures"
        >
          <ClipboardList className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Mes candidatures</span>
        </Link>
      )}

      {user ? (
        <>
          {isAdmin && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-full bg-[#0a2d26] hover:bg-[#124b40] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-3 py-1 text-xs font-bold transition-all shadow-sm"
              title="Accéder au tableau de bord administrateur"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-200" />
              <span>Dashboard</span>
            </Link>
          )}

          <div className="flex items-center gap-1 px-1">
            <User className="w-3 h-3 text-slate-400 dark:text-slate-400" />
            <span className="max-w-[30vw] truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
              {nom}
            </span>
          </div>

          <button
            type="button"
            onClick={async () => {
              await signOut();
              effacerCandidatLocal();
              router.refresh();
            }}
            className="flex items-center gap-1 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
            title="Se déconnecter"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </>
      ) : (
        <Link
          href="/login"
          className="flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 dark:bg-slate-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-200 px-3 py-1 text-xs font-bold transition-colors cursor-pointer"
          title="Se connecter"
        >
          <LogIn className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          <span>Connexion</span>
        </Link>
      )}
    </div>
  );
}
