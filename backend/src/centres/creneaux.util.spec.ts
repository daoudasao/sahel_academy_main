import type { Creneau } from '@prisma/client';
import { dateDuCreneau, deplierCreneaux } from './creneaux.util';

const cr = (p: Partial<Creneau>): Creneau =>
  ({
    id: 'c',
    centreId: 'x',
    dateHeure: null,
    jourSemaine: null,
    heure: null,
    heureFin: null,
    createdAt: new Date(),
    ...p,
  }) as Creneau;

// Lundi 16 novembre 2026, 08:00 UTC.
const maintenant = new Date('2026-11-16T08:00:00Z');

describe('plages hebdomadaires', () => {
  const plage = cr({ jourSemaine: 1, heure: '09:00', heureFin: '12:00' });

  it('découpe la plage en heures sur 2 semaines', () => {
    const d = deplierCreneaux([plage], maintenant);
    expect(d.map((x) => x.id)).toEqual([
      'c@2026-11-16T09:00',
      'c@2026-11-16T10:00',
      'c@2026-11-16T11:00',
      'c@2026-11-23T09:00',
      'c@2026-11-23T10:00',
      'c@2026-11-23T11:00',
    ]);
    expect(d[0]).toMatchObject({ debut: '09:00', fin: '12:00' });
  });

  it('accepte une heure de la plage, refuse le reste', () => {
    expect(dateDuCreneau(plage, '2026-11-23T10:00')?.toISOString()).toBe(
      '2026-11-23T10:00:00.000Z',
    );
    expect(dateDuCreneau(plage, '2026-11-23T12:00')).toBeNull();
    expect(dateDuCreneau(plage, '2026-11-23T10:30')).toBeNull();
    expect(dateDuCreneau(plage, '2026-11-24T10:00')).toBeNull(); // mardi
  });

  it('garde les anciens créneaux à heure unique', () => {
    const ancien = cr({ jourSemaine: 1, heure: '14:00' });
    expect(deplierCreneaux([ancien], maintenant)[0].id).toBe('c@2026-11-16');
    expect(dateDuCreneau(ancien, '2026-11-16')?.toISOString()).toBe(
      '2026-11-16T14:00:00.000Z',
    );
  });
});
