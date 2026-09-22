"use client";

import { useState, useEffect } from "react";
import InfoBanner from "@/app/components/InfoBanner";
import Link from "next/link";
import RadarChart, { RadarMetric } from "@/app/components/RadarChart";
import { formatFCFA, getStatutPaiement, formatDate } from "@/app/lib/mock-data";
import { usersApi, formationsApi, boursesApi, paiementsApi } from "@/app/lib/api";

export default function DashboardPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [formations, setFormations] = useState<any[]>([]);
  const [bourses, setBourses] = useState<any[]>([]);
  const [echeances, setEcheances] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [u, f, b, e] = await Promise.all([
          usersApi.list().catch(() => []),
          formationsApi.list().catch(() => []),
          boursesApi.list().catch(() => []),
          paiementsApi.list().catch(() => []),
        ]);
        setUsers(u);
        setFormations(f);
        setBourses(b);
        setEcheances(e);
      } catch {
        /* UI vide */
      }
    })();
  }, []);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.actif).length;
  const totalFormations = formations.filter((f) => !f.estBourse).length;
  const boursesActives = bourses.filter((b) => b.statut === "ouverte").length;
  const totalCandidatures = bourses.reduce((s, b) => s + (b._count?.candidatures ?? 0), 0);
  const totalRevenu = echeances.reduce((sum, e) => sum + (e.montantPaye ?? 0), 0);
  const totalDu = echeances.reduce((sum, e) => sum + (e.montantDu ?? 0), 0);
  const tauxRecouvrement = totalDu > 0 ? Math.round((totalRevenu / totalDu) * 100) : 0;

  const recentPayments = echeances
    .filter((e) => e.datePaiement)
    .sort((a, b) => (b.datePaiement > a.datePaiement ? 1 : -1))
    .slice(0, 5);

  const recentUsers = [...users]
    .sort((a, b) => ((b.createdAt ?? "") > (a.createdAt ?? "") ? 1 : -1))
    .slice(0, 5);

  // Données mensuelles calculées (6 derniers mois)
  const today = new Date();
  const months: string[] = [];
  const monthlyRevenue = [0, 0, 0, 0, 0, 0];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''));
  }

  echeances.forEach(e => {
    if (e.paiements) {
      e.paiements.forEach((p: any) => {
        const pDate = new Date(p.date);
        const monthDiff = (today.getFullYear() - pDate.getFullYear()) * 12 + today.getMonth() - pDate.getMonth();
        if (monthDiff >= 0 && monthDiff < 6) {
          monthlyRevenue[5 - monthDiff] += p.montant || 0;
        }
      });
    }
  });

  const maxRevenue = Math.max(...monthlyRevenue, 1);

  // Performances par Domaine (Taux d'inscription par département)
  const deptInscriptions: Record<string, number> = {};
  let totalInscriptions = 0;
  
  formations.forEach(f => {
    const deptName = f.departement?.nom || "Autre";
    const count = f._count?.inscriptions || 0;
    deptInscriptions[deptName] = (deptInscriptions[deptName] || 0) + count;
    totalInscriptions += count;
  });

  let radarData: RadarMetric[] = Object.entries(deptInscriptions).map(([subject, count]) => {
    const value = totalInscriptions > 0 ? Math.round((count / totalInscriptions) * 100) : 0;
    return { subject, value };
  });

  // Tri par valeur décroissante et limite à 6
  radarData = radarData.sort((a, b) => b.value - a.value).slice(0, 6);

  // Le radar a besoin d'au moins 3 axes
  while (radarData.length > 0 && radarData.length < 3) {
    radarData.push({ subject: `Domaine ${radarData.length + 1}`, value: 0 });
  }

  if (radarData.length === 0) {
    radarData = [
      { subject: "Informatique", value: 0 },
      { subject: "Gestion", value: 0 },
      { subject: "Design", value: 0 },
    ];
  }

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Compact Green Header */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <span>Sahel Academy Administration</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Vue d'ensemble
            </h1>
            <p className="text-xs text-emerald-100/75 leading-relaxed">
              Bienvenue sur le tableau de bord principal. Suivez vos performances en un coup d'œil.
            </p>
          </div>

          <div className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2">
            <Link href="/dashboard/formations/nouveau" className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0a2d26] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5">
              + Nouvelle formation
            </Link>
            <Link href="/dashboard/bourses/nouveau" className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-semibold transition-all backdrop-blur-md flex items-center justify-center gap-1.5">
              + Nouvelle bourse
            </Link>
          </div>
        </div>
      </div>

      <div className="page-body space-y-6">
        <InfoBanner title="Guide du Tableau de Bord">
          <strong>À quoi ça sert ?</strong> Visualiser la santé globale de l&apos;académie (étudiants inscrits, revenus collectés, bourses ouvertes et performances par filière).<br />
          <strong>Comment l&apos;utiliser ?</strong> Consultez les 4 cartes de statistiques rapides, utilisez les raccourcis d&apos;accès rapide pour créer un élément et observez le graphique radar pour identifier les filières les plus actives.
        </InfoBanner>

        {/* Stats Cards Grid (2 per row on mobile) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger">
          {/* Users Card */}
          <div className="stat-card">
            <div className="stat-icon teal">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <div className="stat-value">{totalUsers}</div>
              <div className="stat-label">Utilisateurs ({activeUsers} actifs)</div>
            </div>
          </div>

          {/* Formations Card */}
          <div className="stat-card">
            <div className="stat-icon blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <div>
              <div className="stat-value">{totalFormations}</div>
              <div className="stat-label">Formations actives</div>
            </div>
          </div>

          {/* Bourses Card */}
          <div className="stat-card">
            <div className="stat-icon purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div>
              <div className="stat-value">{boursesActives}</div>
              <div className="stat-label">Bourses ouvertes</div>
              <div className="stat-trend up">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg>
                {totalCandidatures} candidature{totalCandidatures > 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Revenus Card */}
          <div className="stat-card">
            <div className="stat-icon amber">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <div>
              <div className="stat-value">{formatFCFA(totalRevenu)}</div>
              <div className="stat-label">Revenus collectés</div>
             
            </div>
          </div>
        </div>

        {/* Accès rapide */}
        <div className="card p-4 sm:p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Accès rapide</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/dashboard/utilisateurs" className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] hover:bg-[var(--bg-sidebar-active)] hover:border-[var(--text-sidebar-active)] transition-all flex flex-col items-center justify-center text-center gap-2 group">
              <span className="w-9 h-9 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">Élèves</span>
            </Link>

            <Link href="/dashboard/formations" className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] hover:bg-[var(--bg-sidebar-active)] hover:border-[var(--text-sidebar-active)] transition-all flex flex-col items-center justify-center text-center gap-2 group">
              <span className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">Formations</span>
            </Link>

            <Link href="/dashboard/paiements" className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] hover:bg-[var(--bg-sidebar-active)] hover:border-[var(--text-sidebar-active)] transition-all flex flex-col items-center justify-center text-center gap-2 group">
              <span className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">Paiements</span>
            </Link>

            <Link href="/dashboard/bourses" className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] hover:bg-[var(--bg-sidebar-active)] hover:border-[var(--text-sidebar-active)] transition-all flex flex-col items-center justify-center text-center gap-2 group">
              <span className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              </span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">Bourses</span>
            </Link>
          </div>
        </div>

        {/* Charts Section including Spiderweb (Radar) Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="card p-5 sm:p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Revenus mensuels</h3>
                <p className="text-xs text-[var(--text-secondary)]">Évolution sur 6 mois</p>
              </div>
              <span className="badge badge-success badge-pulse">
                <span className="badge-dot" /> En cours
              </span>
            </div>
            <div className="chart-bar-container pt-4">
              {months.map((month, i) => (
                <div key={month} className="chart-bar-wrapper">
                  <div
                    className="chart-bar"
                    style={{ height: `${(monthlyRevenue[i] / maxRevenue) * 150}px` }}
                    title={formatFCFA(monthlyRevenue[i])}
                  />
                  <span className="chart-bar-label">{month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Spiderweb / Radar Chart Component */}
          <RadarChart
            data={radarData}
            title="Performances par Domaine"
            subtitle="Taux de réussite & inscription"
          />

          {/* Recent Users */}
          <div className="card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Dernières inscriptions</h3>
              <Link href="/dashboard/utilisateurs" className="text-xs font-semibold text-[var(--accent-primary)] hover:underline">
                Voir tout →
              </Link>
            </div>
            <div className="activity-list">
              {recentUsers.map((user) => (
                <div key={user.id} className="activity-item">
                  {user.avatarUrl || user.image || user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl || user.image || user.avatar}
                      alt={user.nom || "Avatar"}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="table-avatar">{(user.nom || "?").charAt(0)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs sm:text-sm truncate">{user.nom}</div>
                    <div className="text-xs text-[var(--text-muted)] truncate">{user.email}</div>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] whitespace-nowrap">{formatDate(user.createdAt ?? user.dateInscription)}</div>
                </div>
              ))}
              {recentUsers.length === 0 && <div className="text-xs text-[var(--text-muted)] py-4 text-center">Aucune inscription.</div>}
            </div>
          </div>
        </div>

        {/* Recent Payments Table */}
        <div className="card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[var(--border-color)] flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Derniers paiements</h3>
              <p className="text-xs text-[var(--text-secondary)]">Aperçu des dernières transactions enregistrées</p>
            </div>
            <Link href="/dashboard/paiements" className="btn btn-ghost btn-sm">
              Voir tout →
            </Link>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Formation</th>
                  <th>Échéance</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((e) => {
                  const statut = getStatutPaiement(e);
                  const nom = e.user?.nom ?? "—";
                  return (
                    <tr key={e.id}>
                      <td>
                        <div className="flex items-center gap-2.5 min-w-[140px]">
                          {e.user?.avatarUrl || e.user?.image || e.user?.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={e.user.avatarUrl || e.user.image || e.user.avatar}
                              alt={nom}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="table-avatar">{nom.charAt(0)}</div>
                          )}
                          <span className="font-medium text-xs sm:text-sm truncate">{nom}</span>
                        </div>
                      </td>
                      <td className="min-w-[150px]">{e.formation?.titre ?? "—"}</td>
                      <td className="min-w-[120px]">{e.libelle}</td>
                      <td className="font-bold whitespace-nowrap">{formatFCFA(e.montantPaye)}</td>
                      <td>
                        <span className={`badge ${statut === "paye" ? "badge-success" : statut === "partiel" ? "badge-warning" : "badge-info"}`}>
                          <span className="badge-dot" />
                          {statut === "paye" ? "Payé" : statut === "partiel" ? "Partiel" : "À venir"}
                        </span>
                      </td>
                      <td className="text-[var(--text-muted)] text-xs whitespace-nowrap">{e.datePaiement ? formatDate(e.datePaiement) : "—"}</td>
                    </tr>
                  );
                })}
                {recentPayments.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Aucun paiement récent.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
