import { ReactNode } from "react";

interface InfoBannerProps {
  title?: string;
  children: ReactNode;
  variant?: "info" | "tip" | "warning";
}

/** Bandeau d'aide contextuel enrichi : guide l'admin sur ce qu'il peut faire sur l'écran. */
export default function InfoBanner({ title = "Guide d'utilisation", children, variant = "info" }: InfoBannerProps) {
  const isWarning = variant === "warning";
  const isTip = variant === "tip";

  const badgeColor = isWarning
    ? "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
    : isTip
    ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
    : "bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400";

  const borderBg = isWarning
    ? "border-l-amber-500 bg-amber-50/70 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60"
    : isTip
    ? "border-l-emerald-500 bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60"
    : "border-l-blue-500 bg-blue-50/70 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60";

  return (
    <div className={`p-4 sm:p-4.5 rounded-xl border border-l-4 ${borderBg} shadow-xs mb-6 flex items-start gap-3.5 transition-all`}>
      <div className={`w-8 h-8 rounded-lg ${badgeColor} flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-sm shadow-xs`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </div>
      <div className="flex-1 min-w-0 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
          <span>ℹ️</span> {title}
        </h4>
        <div className="space-y-1">{children}</div>
      </div>
    </div>
  );
}
