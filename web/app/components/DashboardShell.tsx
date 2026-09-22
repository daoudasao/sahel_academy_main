"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import AppBreadcrumb from "./AppBreadcrumb";
import { FormateursProvider } from "@/app/context/FormateursContext";
import { useSession, signOut } from "@/app/lib/auth-client";
import { isStaffOrAdminRole, canAccessRoute } from "@/app/lib/permissions";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [isPending, session, router, pathname]);

  // Chargement de la session
  if (isPending) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        Chargement…
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Session présente mais rôle ne faisant pas partie du personnel admin/staff
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (session && role && !isStaffOrAdminRole(role)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-2" />
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Accès réservé à l&apos;administration</h1>
        <p style={{ color: "var(--text-secondary)", maxWidth: 420 }}>
          Votre compte ({role}) n&apos;a pas les privilèges requis pour accéder au tableau de bord administratif.
        </p>
        <div className="flex items-center gap-3 mt-2">
          <button className="btn btn-primary" onClick={() => router.push("/")}>
            Aller à l&apos;accueil
          </button>
          <button className="btn btn-secondary" onClick={() => signOut().then(() => router.replace("/login"))}>
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  // Vérification de la permission pour la page actuelle
  const isAuthorizedForPage = canAccessRoute(role, pathname);

  return (
    <FormateursProvider>
    <div>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with open state passed in */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] sticky top-0 z-20">
           <div className="flex items-center gap-3">
             <img src="/Logo Sahel 250x70-01.png" alt="Sahel Academy" className="h-8 object-contain" />
           </div>
           <button 
             onClick={() => setSidebarOpen(true)}
             className="p-2 rounded-md bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <line x1="3" y1="12" x2="21" y2="12"></line>
               <line x1="3" y1="6" x2="21" y2="6"></line>
               <line x1="3" y1="18" x2="21" y2="18"></line>
             </svg>
           </button>
        </header>
        
        {/* Main Content Area */}
        <div className="p-4 sm:p-6 lg:p-8">
          <AppBreadcrumb />
          {isAuthorizedForPage ? (
            children
          ) : (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-rose-500/20 p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto my-12 shadow-lg animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                Accès Non Autorisé (403)
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Votre rôle actuel <span className="font-semibold text-rose-600 dark:text-rose-400">({role})</span> ne dispose pas des permissions requises pour accéder à ce module (<code>{pathname}</code>).
              </p>
              <div className="pt-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retourner à la Vue d'ensemble</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </FormateursProvider>
  );
}
