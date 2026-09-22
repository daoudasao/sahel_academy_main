"use client";

import InfoBanner from "@/app/components/InfoBanner";
import React, { useState, useEffect } from "react";
import { usersApi, rolesApi } from "@/app/lib/api";
import { 
  ShieldCheck, 
  CreditCard, 
  Headphones, 
  GraduationCap, 
  Megaphone, 
  Users, 
  Plus, 
  Check, 
  X, 
  Lock, 
  CheckCircle2, 
  Search,
  AlertCircle,
  UserCheck
} from "lucide-react";

// Structure simplifiée d'un rôle
export interface SystemRole {
  code: string;
  label: string;
  description: string;
  badgeClass: string;
  icon: string;
  permissions: string[];
}

const ROLES_LIST: SystemRole[] = [
  {
    code: "ADMIN",
    label: "Super Admin",
    description: "Accès complet et administration générale du système.",
    badgeClass: "badge-purple",
    icon: "ShieldCheck",
    permissions: ["Accès Total Système", "Attribution des Rôles", "Paramètres Globaux"],
  },
  {
    code: "COMPTABLE",
    label: "Comptable",
    description: "Gestion des finances, encaissements et salaires.",
    badgeClass: "badge-success",
    icon: "CreditCard",
    permissions: ["Paiements & Échéances", "Saisie des Encaissements", "Fiches de Salaires"],
  },
  {
    code: "SUPPORT",
    label: "Support & Admissions",
    description: "Traitement des inscriptions, bourses et chat support client.",
    badgeClass: "badge-info",
    icon: "Headphones",
    permissions: ["Demandes d'Inscription", "Candidatures Bourses", "Chat Support Client"],
  },
  {
    code: "RESPONSABLE_PEDAGOGIQUE",
    label: "Responsable Pédagogique",
    description: "Pilotage des formations, départements, centres et formateurs.",
    badgeClass: "badge-warning",
    icon: "GraduationCap",
    permissions: ["Formations & Cours", "Départements & Centres", "Gestion des Formateurs"],
  },
  {
    code: "COMMUNITY_MANAGER",
    label: "Community Manager",
    description: "Animation du fil d'actualités et envoi de notifications Push.",
    badgeClass: "badge-neutral",
    icon: "Megaphone",
    permissions: ["Actualités & Médias", "Notifications Push", "Modération Commentaires"],
  },
];

import { useSession } from "@/app/lib/auth-client";

export default function SimplifiedRolesPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");

  // Recherche & Filtres
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  // Toasts
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Modal Nouveau Rôle
  const [showModal, setShowModal] = useState(false);
  const [newRole, setNewRole] = useState({ label: "", code: "", description: "" });

  useEffect(() => {
    (async () => {
      try {
        const data = await usersApi.list();
        setUsers(data || []);
      } catch (err) {
        console.error("Erreur chargement utilisateurs:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4500);
  };

  // Attribution de rôle
  const handleAssignRole = async (userId: string, newRoleCode: string) => {
    if (currentUserId && userId === currentUserId) {
      showError("Vous ne pouvez pas modifier votre propre rôle.");
      return;
    }

    setAssigningUserId(userId);
    try {
      await rolesApi.assignUserRole(userId, newRoleCode);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRoleCode } : u))
      );
      showSuccess(`Rôle mis à jour vers "${newRoleCode}".`);
    } catch (err: any) {
      console.error("Erreur mise à jour rôle:", err);
      showError(`Échec de la modification : ${err?.message || "Erreur serveur"}`);
    } finally {
      setAssigningUserId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      (u.nom || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase());
    const matchRole =
      !roleFilter || (u.role || "ETUDIANT").toUpperCase() === roleFilter.toUpperCase();
    return matchSearch && matchRole;
  });

  const getRoleBadge = (roleCode?: string) => {
    const code = (roleCode || "ETUDIANT").toUpperCase();
    switch (code) {
      case "ADMIN":
        return <span className="badge badge-purple font-semibold">Super Admin</span>;
      case "COMPTABLE":
        return <span className="badge badge-success font-semibold">Comptable</span>;
      case "SUPPORT":
        return <span className="badge badge-info font-semibold">Support & Admissions</span>;
      case "RESPONSABLE_PEDAGOGIQUE":
        return <span className="badge badge-warning font-semibold">Resp. Pédagogique</span>;
      case "COMMUNITY_MANAGER":
        return <span className="badge badge-neutral font-semibold">Community Manager</span>;
      case "FORMATEUR":
        return <span className="badge badge-info font-semibold">Formateur</span>;
      case "STAFF":
        return <span className="badge badge-warning font-semibold">Staff</span>;
      case "ETUDIANT":
      default:
        return <span className="badge badge-neutral font-semibold">Étudiant</span>;
    }
  };

  const renderIcon = (name: string) => {
    switch (name) {
      case "ShieldCheck": return <ShieldCheck className="w-5 h-5 text-purple-400" />;
      case "CreditCard": return <CreditCard className="w-5 h-5 text-emerald-400" />;
      case "Headphones": return <Headphones className="w-5 h-5 text-sky-400" />;
      case "GraduationCap": return <GraduationCap className="w-5 h-5 text-amber-400" />;
      case "Megaphone": return <Megaphone className="w-5 h-5 text-indigo-400" />;
      default: return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Notifications Toast */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-emerald-900/90 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/40 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-rose-900/90 text-white px-4 py-3 rounded-xl shadow-2xl border border-rose-500/40 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{errorToast}</span>
        </div>
      )}

      {/* En-tête Épuré */}
      <div className="w-full bg-gradient-to-r from-[#0a2d26] via-[#0d3b32] to-[#124b40] rounded-xl sm:rounded-2xl p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sécurité & Rôles</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Gestion des Rôles & Équipe</h1>
          <p className="text-xs text-emerald-100/80">
            Attribuez facilement des rôles d&apos;administration aux membres de votre équipe.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0a2d26] font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Rôle</span>
        </button>
      </div>

      <InfoBanner>
        <strong>Simple & Sécurisé :</strong> Sélectionnez un utilisateur ci-dessous pour modifier son rôle d&apos;administration. Les changements prennent effet immédiatement pour ses accès.
      </InfoBanner>

      {/* Onglets Simples */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "users"
              ? "bg-[var(--accent-primary)] text-white shadow-sm"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Attribution des Rôles ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "roles"
              ? "bg-[var(--accent-primary)] text-white shadow-sm"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Catalogue des Rôles ({ROLES_LIST.length})</span>
        </button>
      </div>

      {/* VUE 1 : TABLEAU DES UTILISATEURS ET ATTRIBUTION SIMPLIFIÉE */}
      {activeTab === "users" && (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Attribution Rapide par Membre
            </h2>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Rechercher nom ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="py-1.5 px-3 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">Tous les rôles</option>
                {ROLES_LIST.map((r) => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
                <option value="FORMATEUR">Formateur</option>
                <option value="ETUDIANT">Étudiant</option>
              </select>
            </div>
          </div>

          <div className="table-responsive rounded-xl border border-[var(--border-color)]">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-[var(--bg-input)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="p-3 font-semibold text-[var(--text-primary)]">Utilisateur</th>
                  <th className="p-3 font-semibold text-[var(--text-primary)]">Email</th>
                  <th className="p-3 font-semibold text-[var(--text-primary)]">Rôle Actuel</th>
                  <th className="p-3 font-semibold text-[var(--text-primary)] text-right">Modifier le Rôle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center p-6 text-[var(--text-muted)]">
                      Chargement des utilisateurs…
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-6 text-[var(--text-muted)]">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const currentRole = (u.role || "ETUDIANT").toUpperCase();
                    const isSelf = !!currentUserId && u.id === currentUserId;

                    return (
                      <tr key={u.id} className="hover:bg-[var(--bg-input)]/50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {u.image || u.avatarUrl ? (
                              <img
                                src={u.image || u.avatarUrl}
                                alt={u.nom || "Avatar"}
                                className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)]"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
                                {(u.nom || "U")[0].toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                                <span>{u.nom || "Sans nom"}</span>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                                    Vous
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-[var(--text-secondary)]">{u.email}</td>

                        <td className="p-3">{getRoleBadge(currentRole)}</td>

                        <td className="p-3 text-right">
                          <select
                            value={currentRole}
                            disabled={assigningUserId === u.id || isSelf}
                            title={isSelf ? "Vous ne pouvez pas modifier votre propre rôle" : undefined}
                            onChange={(e) => handleAssignRole(u.id, e.target.value)}
                            className={`py-1.5 px-3 text-xs rounded-xl border border-[var(--border-color)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-emerald-500 shadow-xs transition-colors ${
                              isSelf ? "bg-[var(--bg-input)] opacity-60 cursor-not-allowed" : "bg-[var(--bg-card)] cursor-pointer hover:border-emerald-400"
                            }`}
                          >
                            <option value="ADMIN">Super Admin</option>
                            <option value="COMPTABLE">Comptable</option>
                            <option value="SUPPORT">Support & Admissions</option>
                            <option value="RESPONSABLE_PEDAGOGIQUE">Resp. Pédagogique</option>
                            <option value="COMMUNITY_MANAGER">Community Manager</option>
                            <option value="STAFF">Staff Général</option>
                            <option value="FORMATEUR">Formateur</option>
                            <option value="ETUDIANT">Étudiant</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VUE 2 : CATALOGUE DES RÔLES SIMPLIFIÉ */}
      {activeTab === "roles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLES_LIST.map((role) => (
            <div
              key={role.code}
              className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border-color)] shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)]">
                  {renderIcon(role.icon)}
                </div>
                <span className={`badge ${role.badgeClass} font-bold text-[10px]`}>
                  {role.code}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">{role.label}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{role.description}</p>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] space-y-1">
                <div className="text-[11px] font-semibold text-[var(--text-secondary)]">Permissions clés :</div>
                <ul className="space-y-1">
                  {role.permissions.map((p, i) => (
                    <li key={i} className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL SIMPLIFIÉ NOUVEAU RÔLE */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[var(--bg-card)] rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[var(--border-color)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-bold text-base text-[var(--text-primary)]">Créer un Rôle Personnalisé</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-md hover:bg-[var(--bg-input)] text-[var(--text-muted)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Nom du rôle *</label>
                <input
                  type="text"
                  placeholder="Ex: Gestionnaire de Stock"
                  value={newRole.label}
                  onChange={(e) => setNewRole({ ...newRole, label: e.target.value, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Responsabilités de ce rôle..."
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  showSuccess(`Nouveau rôle "${newRole.label}" créé.`);
                  setShowModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0a2d26] font-bold text-xs cursor-pointer shadow-sm"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
