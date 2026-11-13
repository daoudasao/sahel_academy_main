import { nomDe } from '../auth/roles.util';

/**
 * Corbeille : les bourses, formations, centres, départements et actualités ne
 * sont plus effacés à la suppression. Ils sont marqués (`deletedAt`) et
 * disparaissent de partout ; un admin peut les restaurer depuis la corbeille.
 */

/** Filtre « élément non supprimé », à ajouter à toute lecture. */
export const NON_SUPPRIME = { deletedAt: null } as const;

type Auteur =
  | {
      id?: string | null;
      nom?: string | null;
      name?: string | null;
      role?: string | null;
    }
  | null
  | undefined;

/** Données à écrire pour envoyer un élément à la corbeille. */
export function versCorbeille(user: Auteur) {
  return {
    deletedAt: new Date(),
    deletedById: user?.id ?? null,
    deletedByNom: nomDe(user) || null,
  };
}

/** Données à écrire pour sortir un élément de la corbeille. */
export const HORS_CORBEILLE = {
  deletedAt: null,
  deletedById: null,
  deletedByNom: null,
} as const;
