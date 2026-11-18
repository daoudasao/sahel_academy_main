import type { Creneau } from '@prisma/client';

/**
 * Créneaux hebdomadaires (jour de la semaine + heure) : l'app ne connaît que
 * des créneaux datés `{ id, dateHeure }`. L'API déplie donc chaque créneau
 * hebdomadaire en dates concrètes sur les prochains jours, avec un identifiant
 * composé `<idCreneau>@<AAAA-MM-JJ>` que `POST /rendez-vous` sait relire.
 * Ainsi, les versions de l'app déjà installées continuent de fonctionner.
 *
 * Plage (« de 09:00 à 17:00 ») : découpée en heures de rendez-vous toutes les
 * PAS_MINUTES (09:00, 10:00 … 16:00), identifiant `<idCreneau>@<AAAA-MM-JJ>T<HH:mm>`.
 *
 * Heures exprimées à Bamako (UTC+0, sans heure d'été) : pas de décalage.
 */

/** Nombre de jours à venir proposés pour un créneau hebdomadaire. */
export const HORIZON_JOURS = 14;

const SEPARATEUR = '@';

/** Écart entre deux heures de rendez-vous proposées dans une plage. */
export const PAS_MINUTES = 60;

/** `debut`/`fin` : plage du jour (« 09:00 »/« 17:00 ») pour l'affichage dans l'app. */
export type CreneauDate = {
  id: string;
  dateHeure: Date;
  debut?: string;
  fin?: string;
};

const enMinutes = (h: string) => {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
};
const enHeure = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Heures de début proposées pour un créneau (une seule sans heure de fin). */
export function heuresDuCreneau(cr: Creneau): string[] {
  if (!cr.heure) return [];
  if (!cr.heureFin) return [cr.heure];
  const heures: string[] = [];
  for (
    let m = enMinutes(cr.heure);
    m < enMinutes(cr.heureFin);
    m += PAS_MINUTES
  ) {
    heures.push(enHeure(m));
  }
  return heures;
}

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
        for (const heure of heuresDuCreneau(cr)) {
          const dateHeure = aLaDate(jour, heure);
          if (dateHeure <= maintenant) continue;
          resultat.push(
            cr.heureFin
              ? {
                  id: `${cr.id}${SEPARATEUR}${dateCle(dateHeure)}T${heure}`,
                  dateHeure,
                  debut: cr.heure,
                  fin: cr.heureFin,
                }
              : { id: `${cr.id}${SEPARATEUR}${dateCle(dateHeure)}`, dateHeure },
          );
        }
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
 * Date/heure réelle d'un créneau pour un rendez-vous, ou null si le jour (et
 * l'heure, pour une plage) demandés ne correspondent pas au créneau.
 */
export function dateDuCreneau(cr: Creneau, jour?: string): Date | null {
  if (cr.jourSemaine && cr.heure) {
    const m = jour?.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?$/);
    if (!m) return null;
    const j = new Date(`${m[1]}T00:00:00Z`);
    if (Number.isNaN(j.getTime()) || jourIso(j) !== cr.jourSemaine) return null;
    const heure = m[2] ?? cr.heure;
    if (!heuresDuCreneau(cr).includes(heure)) return null;
    return aLaDate(j, heure);
  }
  return jour ? null : cr.dateHeure;
}
