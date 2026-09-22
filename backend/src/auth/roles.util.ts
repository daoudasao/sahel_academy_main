import { Role } from '@prisma/client';

/**
 * Rôles « équipe » : ils travaillent dans le dashboard d'administration et
 * peuvent consulter les données des autres utilisateurs. Un ETUDIANT ou un
 * FORMATEUR, lui, ne voit que ce qui le concerne.
 */
export const ROLES_EQUIPE: readonly Role[] = [
  Role.ADMIN,
  Role.STAFF,
  Role.SUPPORT,
  Role.RESPONSABLE_PEDAGOGIQUE,
  Role.COMPTABLE,
  Role.COMMUNITY_MANAGER,
];

type AvecRole = { role?: string | null } | null | undefined;

/** Vrai si l'utilisateur a l'un des [roles] donnés. */
export function aUnRole(user: AvecRole, roles: readonly Role[]): boolean {
  return !!user?.role && (roles as readonly string[]).includes(user.role);
}

/** Vrai si l'utilisateur fait partie de l'équipe (voir [ROLES_EQUIPE]). */
export function estEquipe(user: AvecRole): boolean {
  return aUnRole(user, ROLES_EQUIPE);
}

type Profil =
  | { role?: string | null; nom?: string | null; name?: string | null }
  | null
  | undefined;

/**
 * Nom affichable d'un utilisateur. L'utilisateur de session (better-auth)
 * expose `name` ; un utilisateur lu via Prisma expose `nom`.
 */
export function nomDe(user: Profil): string {
  return (user?.nom ?? user?.name ?? '').trim();
}

/**
 * Nom et libellé de rôle affichés sous un commentaire, toujours déduits du
 * compte connecté. Seule l'équipe peut signer d'un autre nom (ex. « Sahel
 * Academy » depuis le dashboard).
 */
export function auteurDeCommentaire(
  user: Profil,
  auteurDemande?: string,
): { auteur: string; role: string } {
  if (estEquipe(user)) {
    return {
      auteur: auteurDemande?.trim() || nomDe(user) || 'Sahel Academy',
      role: 'Admin',
    };
  }
  if (user?.role === Role.FORMATEUR) {
    return { auteur: nomDe(user) || 'Formateur', role: 'Formateur' };
  }
  return { auteur: nomDe(user) || 'Élève', role: 'Élève' };
}
