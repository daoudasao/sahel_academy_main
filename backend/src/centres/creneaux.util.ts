import type { Creneau } from '@prisma/client';

/**
 * Créneaux hebdomadaires (jour de la semaine + heure) : l'app ne connaît que
 * des créneaux datés `{ id, dateHeure }`. L'API déplie donc chaque créneau
 * hebdomadaire en dates concrètes sur les prochains jours, avec un identifiant
 * composé `<idCreneau>@<AAAA-MM-JJ>` que `POST /rendez-vous` sait relire.
 * Ainsi, les versions de l'app déjà installées continuent de fonctionner.
 *
 * Heures exprimées à Bamako (UTC+0, sans heure d'été) : pas de décalage.
 */

/** Nombre de jours à venir proposés pour un créneau hebdomadaire. */
export const HORIZON_JOURS = 14;

const SEPARATEUR = '@';

export type CreneauDate = { id: string; dateHeure: Date };

/** Jour ISO (1 = lundi … 7 = dimanche) d'une date UTC. */
const jourIso = (d: Date) => ((d.getUTCDay() + 6) % 7) + 1;

const dateCle = (d: Date) => d.toISOString().slice(0, 10);

/** Date/heure d'un créneau hebdomadaire pour le jour (UTC) donné. */
function aLaDate(jour: Date, heure: string): Date {
  const [h, m] = heure.split(':').map(Number);
  return new Date(
    Date.UTC(
      jour.getUTCFullYear(),
      jour.getUTCMonth(),
      jour.getUTCDate(),
      h,
      m,
    ),
  );
}

/** Créneaux tels que l'app les attend : ponctuels + occurrences à venir. */
export function deplierCreneaux(
  creneaux: Creneau[],
  maintenant = new Date(),
): CreneauDate[] {
  const resultat: CreneauDate[] = [];
  for (const cr of creneaux) {
    if (cr.jourSemaine && cr.heure) {
      for (let i = 0; i < HORIZON_JOURS; i++) {
        const jour = new Date(maintenant.getTime() + i * 86_400_000);
        if (jourIso(jour) !== cr.jourSemaine) continue;
        const dateHeure = aLaDate(jour, cr.heure);
        if (dateHeure <= maintenant) continue;
        resultat.push({
          id: `${cr.id}${SEPARATEUR}${dateCle(dateHeure)}`,
          dateHeure,
        });
      }
    } else if (cr.dateHeure) {
      resultat.push({ id: cr.id, dateHeure: cr.dateHeure });
    }
  }
  // Un ponctuel et un hebdomadaire à la même heure : une seule proposition.
  const vus = new Set<number>();
  return resultat
    .sort((a, b) => a.dateHeure.getTime() - b.dateHeure.getTime())
    .filter((c) => {
      const t = c.dateHeure.getTime();
      if (vus.has(t)) return false;
      vus.add(t);
      return true;
    });
}

/** Sépare un identifiant reçu de l'app en `{ id, jour }` (jour absent = ponctuel). */
export function lireIdCreneau(idRecu: string): { id: string; jour?: string } {
  const [id, jour] = idRecu.split(SEPARATEUR);
  return jour ? { id, jour } : { id };
}

/**
 * Date/heure réelle d'un créneau pour un rendez-vous, ou null si le jour
 * demandé ne correspond pas au créneau.
 */
export function dateDuCreneau(cr: Creneau, jour?: string): Date | null {
  if (cr.jourSemaine && cr.heure) {
    if (!jour || !/^\d{4}-\d{2}-\d{2}$/.test(jour)) return null;
    const j = new Date(`${jour}T00:00:00Z`);
    if (Number.isNaN(j.getTime()) || jourIso(j) !== cr.jourSemaine) return null;
    return aLaDate(j, cr.heure);
  }
  return jour ? null : cr.dateHeure;
}
