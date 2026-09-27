"use client";

import { useState, useEffect } from "react";
import InfoBanner from "@/app/components/InfoBanner";
import { appInstallsApi } from "@/app/lib/api";
import type { AppInstallStats, AppInstall } from "@/app/lib/api";
import { formatDateTime } from "@/app/lib/mock-data";

// Couleurs et labels pour chaque plateforme
const PLATEFORME_META: Record<string, { label: string; color: string; bg: string }> = {
  android: { label: "Android", color: "text-emerald-700", bg: "bg-emerald-100" },
  ios: { label: "iOS", color: "text-blue-700", bg: "bg-blue-100" },
  web: { label: "Web", color: "text-amber-700", bg: "bg-amber-100" },
  linux: { label: "Linux", color: "text-orange-700", bg: "bg-orange-100" },
  macos: { label: "macOS", color: "text-slate-700", bg: "bg-slate-100" },
  windows: { label: "Windows", color: "text-violet-700", bg: "bg-violet-100" },
};

const TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  native: { label: "App Native", icon: "📱", color: "text-emerald-700", bg: "bg-emerald-50" },
  pwa: { label: "PWA", icon: "🌐", color: "text-blue-700", bg: "bg-blue-50" },
  navigateur: { label: "Navigateur", icon: "🖥️", color: "text-slate-700", bg: "bg-slate-50" },
};

export default function InstallationsPage() {
  const [stats, setStats] = useState<AppInstallStats | null>(null);
  const [installs, setInstalls] = useState<AppInstall[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filtrePlateforme, setFiltrePlateforme] = useState("");
  const [filtreType, setFiltreType] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appInstallsApi.stats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    appInstallsApi
      .list({
        plateforme: filtrePlateforme || undefined,
        typeInstallation: filtreType || undefined,
        page,
        limite: 20,
      })
      .then((res) => {
        setInstalls(res.items);
        setTotal(res.total);
        setPages(res.pages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filtrePlateforme, filtreType]);

  // Pourcentage maximal pour les barres
  const maxPlateforme = Math.max(...(stats?.parPlateforme.map((p) => p.nombre) ?? [1]), 1);
  const maxType = Math.max(...(stats?.parType.map((t) => t.nombre) ?? [1]), 1);

  return (
    <div className="w-full max-w-full space-y-4">
      {/* En-tête */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
            <span>📱 Suivi des Installations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Installations & Utilisations
          </h1>
          <p className="text-xs text-emerald-100/75 leading-relaxed">
            Suivez en temps réel qui utilise l&apos;application Sahel Academy (PWA et app native).
          </p>
        </div>
      </div>

      <div className="page-body space-y-6">
        <InfoBanner title="Suivi des Installations">
          <strong>À quoi ça sert ?</strong> Savoir combien d&apos;utilisateurs ont installé ou utilisent
          activement l&apos;application (PWA ou app native), et sur quelles plateformes.<br />
          <strong>Comment ça marche ?</strong> À chaque ouverture de l&apos;app, un signal anonyme est
          envoyé au serveur. Les appareils sont identifiés de manière unique pour éviter les doublons.
        </InfoBanner>

        {/* Cartes de statistiques */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 stagger">
            {/* Total */}
            <div className="stat-card">
              <div className="stat-icon teal">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Appareils enregistrés</div>
              </div>
            </div>

            {/* Utilisateurs uniques */}
            <div className="stat-card">
              <div className="stat-icon blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <div className="stat-value">{stats.utilisateursUniques}</div>
                <div className="stat-label">Utilisateurs uniques</div>
              </div>
            </div>

            {/* Actifs 24h */}
            <div className="stat-card">
              <div className="stat-icon purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <div className="stat-value">{stats.actifs24h}</div>
                <div className="stat-label">Actifs (24h)</div>
              </div>
            </div>

            {/* Actifs 7j */}
            <div className="stat-card">
              <div className="stat-icon amber">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <div className="stat-value">{stats.actifs7j}</div>
                <div className="stat-label">Actifs (7 jours)</div>
              </div>
            </div>

            {/* Actifs 30j */}
            <div className="stat-card">
              <div className="stat-icon teal">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <div>
                <div className="stat-value">{stats.actifs30j}</div>
                <div className="stat-label">Actifs (30 jours)</div>
              </div>
            </div>
          </div>
        )}

        {/* Graphiques de répartition */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Par plateforme */}
            <div className="card p-5 sm:p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">
                Répartition par plateforme
              </h3>
              <div className="space-y-3">
                {stats.parPlateforme.map((p) => {
                  const meta = PLATEFORME_META[p.plateforme] ?? {
                    label: p.plateforme,
                    color: "text-gray-700",
                    bg: "bg-gray-100",
                  };
                  const pct = Math.round((p.nombre / maxPlateforme) * 100);
                  return (
                    <div key={p.plateforme} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color} ${meta.bg}`}>
                          {meta.label}
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">{p.nombre}</span>
                      </div>
                      <div className="w-full h-2.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {stats.parPlateforme.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">Aucune donnée.</p>
                )}
              </div>
            </div>

            {/* Par type */}
            <div className="card p-5 sm:p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">
                Type d&apos;installation
              </h3>
              <div className="space-y-3">
                {stats.parType.map((t) => {
                  const meta = TYPE_META[t.type] ?? {
                    label: t.type,
                    icon: "❓",
                    color: "text-gray-700",
                    bg: "bg-gray-50",
                  };
                  const pct = Math.round((t.nombre / maxType) * 100);
                  return (
                    <div key={t.type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color} ${meta.bg}`}>
                          {meta.icon} {meta.label}
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">{t.nombre}</span>
                      </div>
                      <div className="w-full h-2.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {stats.parType.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">Aucune donnée.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tableau des installations */}
        <div className="card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[var(--border-color)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Détail des installations
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {total} appareil{total > 1 ? "s" : ""} enregistré{total > 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                value={filtrePlateforme}
                onChange={(e) => { setFiltrePlateforme(e.target.value); setPage(1); }}
              >
                <option value="">Toutes les plateformes</option>
                <option value="android">Android</option>
                <option value="ios">iOS</option>
                <option value="web">Web</option>
                <option value="linux">Linux</option>
                <option value="macos">macOS</option>
                <option value="windows">Windows</option>
              </select>
              <select
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                value={filtreType}
                onChange={(e) => { setFiltreType(e.target.value); setPage(1); }}
              >
                <option value="">Tous les types</option>
                <option value="native">App Native</option>
                <option value="pwa">PWA</option>
                <option value="navigateur">Navigateur</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Plateforme</th>
                  <th>Type</th>
                  <th>Version</th>
                  <th>Appareil</th>
                  <th>Dernier accès</th>
                  <th>Installation</th>
                </tr>
              </thead>
              <tbody>
                {installs.map((install) => {
                  const plateMeta = PLATEFORME_META[install.plateforme] ?? {
                    label: install.plateforme,
                    color: "text-gray-700",
                    bg: "bg-gray-100",
                  };
                  const typeMeta = TYPE_META[install.typeInstallation] ?? {
                    label: install.typeInstallation,
                    icon: "❓",
                    color: "text-gray-700",
                    bg: "bg-gray-50",
                  };
                  return (
                    <tr key={install.id}>
                      <td>
                        <div className="flex items-center gap-2.5 min-w-[140px]">
                          {install.user.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={install.user.image}
                              alt={install.user.nom}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="table-avatar">
                              {install.user.nom.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-xs sm:text-sm truncate">
                              {install.user.nom}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] truncate">
                              {install.user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${plateMeta.color} ${plateMeta.bg}`}>
                          {plateMeta.label}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${typeMeta.color} ${typeMeta.bg}`}>
                          {typeMeta.icon} {typeMeta.label}
                        </span>
                      </td>
                      <td className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                        {install.appVersion ?? "—"}
                      </td>
                      <td className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                        {install.deviceModel ?? "—"}
                      </td>
                      <td className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {formatDateTime(install.dernierAcces)}
                      </td>
                      <td className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {formatDateTime(install.createdAt)}
                      </td>
                    </tr>
                  );
                })}
                {!loading && installs.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}
                    >
                      Aucune installation enregistrée.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}
                    >
                      Chargement…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">
                Page {page} sur {pages} — {total} résultat{total > 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Précédent
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
