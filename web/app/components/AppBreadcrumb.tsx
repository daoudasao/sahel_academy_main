"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/app/components/ui/breadcrumb";
import { Home } from "lucide-react";

import ThemeToggle from "@/app/components/ThemeToggle";

const labelMap: Record<string, string> = {
  dashboard: "Tableau de bord",
  bourses: "Bourses d'études",
  candidatures: "Candidatures",
  formations: "Formations",
  departements: "Départements",
  centres: "Centres",
  notifications: "Notifications",
  paiements: "Paiements",
  utilisateurs: "Utilisateurs",
  actualite: "Actualités",
  support: "Support Client",
  journal: "Journal d'audit",
  nouveau: "Création",
  modifier: "Modification",
};

export default function AppBreadcrumb() {
  const pathname = usePathname();
  if (!pathname) return null;

  const pathSegments = pathname.split("/").filter(Boolean);

  return (
    <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
      <Breadcrumb className="animate-in fade-in duration-300">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard" className="flex items-center gap-1 text-xs sm:text-sm text-slate-600 hover:text-slate-900 font-medium">
              <Home className="w-3.5 h-3.5 text-slate-500" />
              Accueil
            </BreadcrumbLink>
          </BreadcrumbItem>

          {pathSegments.map((segment, index) => {
            const href = "/" + pathSegments.slice(0, index + 1).join("/");
            const isLast = index === pathSegments.length - 1;
            const displayLabel = labelMap[segment] || (segment.length > 15 ? segment.substring(0, 12) + "..." : segment);

            // Skip redundant "dashboard" segment if home link already links to dashboard
            if (segment === "dashboard" && index === 0 && pathSegments.length > 1) {
              return null;
            }

            return (
              <div key={href} className="inline-flex items-center gap-1.5">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                      {displayLabel}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={href} className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900">
                      {displayLabel}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <ThemeToggle />
    </div>
  );
}
