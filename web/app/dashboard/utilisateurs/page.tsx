"use client";

import InfoBanner from "@/app/components/InfoBanner";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate } from "@/app/lib/mock-data";
import { usersApi } from "@/app/lib/api";

export default function UtilisateursPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8;

  useEffect(() => {
    (async () => {
      try {
        setUsers(await usersApi.list());
      } catch {
        /* UI vide */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getRoleBadge = (role?: string) => {
    const r = (role || "ETUDIANT").toUpperCase();
    switch (r) {
      case "SUPER_ADMIN":
        return <span className="badge badge-danger font-semibold">Super Admin</span>;
      case "CHEF_CENTRE":
        return <span className="badge badge-purple font-semibold">Chef de centre</span>;
      case "FORMATEUR":
        return <span className="badge badge-info font-semibold">Formateur</span>;
      case "STAFF":
        return <span className="badge badge-warning font-semibold">Staff</span>;
      case "ETUDIANT":
      default:
        return <span className="badge badge-neutral font-semibold">Étudiant</span>;
    }
  };

  const [filterRole, setFilterRole] = useState("");

  const filtered = users.filter((u) => {
    const matchSearch =
      (u.nom || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatut = !filterStatut || (filterStatut === "actif" ? u.actif : !u.actif);
    const matchRole = !filterRole || (u.role || "ETUDIANT").toUpperCase() === filterRole.toUpperCase();
    return matchSearch && matchStatut && matchRole;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Compact Green Header */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <span>Gestion des Apprenants</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Élèves & Utilisateurs
            </h1>
            <p className="text-xs text-emerald-100/75 leading-relaxed">
              Consultez et gérez les comptes des élèves inscrits.
            </p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <InfoBanner>
          <strong>Objectif :</strong> Consulter et gérer la liste de tous les élèves inscrits.<br />
          <strong>Utilité :</strong> Permet d&apos;accéder rapidement aux informations de contact, au rôle, au suivi des paiements et à l&apos;historique des formations d&apos;un élève spécifique.
        </InfoBanner>
        <div className="table-container animate-in">
          <div className="table-toolbar">
            <div className="table-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <select
              className="form-select"
              style={{ minWidth: 150 }}
              value={filterRole}
              onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
            >
              <option value="">Tous les rôles</option>
              <option value="ETUDIANT">Étudiants</option>
              <option value="FORMATEUR">Formateurs</option>
              <option value="STAFF">Staff</option>
              <option value="CHEF_CENTRE">Chefs de centre</option>
              <option value="SUPER_ADMIN">Super Admins</option>
            </select>
            <select
              className="form-select"
              style={{ minWidth: 150 }}
              value={filterStatut}
              onChange={(e) => { setFilterStatut(e.target.value); setCurrentPage(1); }}
            >
              <option value="">Tous les statuts</option>
              <option value="actif">Actifs</option>
              <option value="inactif">Inactifs</option>
            </select>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Inscription</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Chargement…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Aucun utilisateur.</td></tr>
              ) : paginated.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {user.avatarUrl || user.image ? (
                        <img
                          src={user.avatarUrl || user.image}
                          alt={user.nom || user.name || "Avatar"}
                          style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        <div className="table-avatar">{(user.nom || user.name || "?").charAt(0)}</div>
                      )}
                      <span style={{ fontWeight: 600 }}>{user.nom || user.name}</span>
                      {Array.isArray(user.providers) && user.providers.includes("google") && (
                        <span
                          title="Inscrit via Google"
                          aria-label="Inscrit via Google"
                          style={{ display: "inline-flex", flexShrink: 0 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{user.email}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{user.telephone || "—"}</td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td>
                    <span className={`badge ${user.actif ? "badge-success" : "badge-danger"} badge-pulse`}>
                      <span className="badge-dot" />
                      {user.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{formatDate(user.createdAt ?? user.dateInscription)}</td>
                  <td>
                    <Link href={`/dashboard/utilisateurs/${user.id}`} className="btn btn-ghost btn-sm">
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {totalPages > 1 && (
            <div className="table-pagination">
              <span>
                Affichage {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} sur {filtered.length}
              </span>
              <div className="table-pagination-buttons">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} className={currentPage === i + 1 ? "active" : ""} onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
