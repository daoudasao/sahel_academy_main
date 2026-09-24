import type { PrismaService } from '../prisma/prisma.service';
import { formatEcheanceLibelle } from '../paiements/echeance-libelle';

/**
 * État lisible d'un élément à un instant donné (« avant » ou « après »
 * l'action) : uniquement des valeurs simples (texte, nombre, booléen, date ISO).
 */
export type Instantane = Record<string, string | number | boolean | null>;

type Params = Record<string, unknown>;

/**
 * Contexte d'audit d'un type d'élément (finances notamment) : de quoi relire
 * l'élément en base avec les personnes concernées, et le nommer. Permet au
 * journal de montrer l'ancien et le nouveau montant d'une modification, ou le
 * montant d'un paiement supprimé.
 */
export interface ContexteAudit {
  /**
   * Ressource affichée dans le journal (au lieu du 1er segment de route).
   * Peut dépendre de l'action (ex. un changement de salaire est rangé dans
   * « salaires »).
   */
  ressource:
    | string
    | ((etat: {
        avant: Instantane | null;
        apres: Instantane | null;
        corps: Record<string, unknown>;
      }) => string);
  /**
   * Relit l'élément : identifiant pris dans les paramètres de route ou dans
   * la réponse (création). À défaut, renvoie le contexte parent (échéance,
   * formateur…) ; null si rien n'est trouvé.
   */
  lire(prisma: PrismaService, params: Params, reponse: unknown): Promise<Instantane | null>;
  /** Libellé lisible à partir d'un instantané. */
  libelle(x: Instantane): string;
}

const fcfa = (n: unknown) =>
  typeof n === 'number' ? `${new Intl.NumberFormat('fr-FR').format(n)} FCFA` : null;

const joindre = (...parties: (string | null | undefined | false)[]) =>
  parties.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' · ');

const idParmi = (...valeurs: unknown[]) =>
  valeurs.find((v): v is string => typeof v === 'string' && v.length > 0);

const idDeReponse = (reponse: unknown) =>
  reponse && typeof reponse === 'object' && !Array.isArray(reponse)
    ? (reponse as { id?: unknown }).id
    : undefined;

const chaine = (v: unknown) => (typeof v === 'string' && v ? v : null);

/** Personnes et formation liées à une échéance. */
const INCLURE_ECHEANCE = {
  user: { select: { nom: true } },
  formation: { select: { titre: true } },
} as const;

async function contexteEcheance(
  prisma: PrismaService,
  id: string,
): Promise<Instantane | null> {
  const e = await prisma.echeance.findUnique({ where: { id }, include: INCLURE_ECHEANCE });
  if (!e) return null;
  return {
    echeance: formatEcheanceLibelle(e.libelle, e.dateEcheance),
    montantDu: e.montantDu,
    montantPaye: e.montantPaye,
    dateEcheance: e.dateEcheance.toISOString(),
    eleve: e.user?.nom ?? null,
    formation: e.formation?.titre ?? null,
  };
}

async function contexteFiche(
  prisma: PrismaService,
  id: string,
): Promise<Instantane | null> {
  const f = await prisma.ficheSalaire.findUnique({
    where: { id },
    include: {
      formateur: { select: { nom: true } },
      versements: { select: { montant: true } },
    },
  });
  if (!f) return null;
  return {
    mois: f.mois,
    montantDu: f.montantDu,
    totalVerse: f.versements.reduce((s, v) => s + v.montant, 0),
    formateur: f.formateur?.nom ?? null,
  };
}

export const CONTEXTES_AUDIT = {
  /** Échéance d'un élève (ce qu'il doit payer). */
  echeance: {
    ressource: 'paiements',
    async lire(prisma, _params, reponse): Promise<Instantane | null> {
      const id = idParmi(idDeReponse(reponse));
      return id ? contexteEcheance(prisma, id) : null;
    },
    libelle: (x) => joindre(chaine(x.echeance), fcfa(x.montantDu), chaine(x.eleve)),
  },

  /** Paiement enregistré sur une échéance. */
  paiement: {
    ressource: 'paiements',
    async lire(prisma, params, reponse): Promise<Instantane | null> {
      const id = idParmi(params.hId, idDeReponse(reponse));
      if (id) {
        const p = await prisma.paiementHistorique.findUnique({
          where: { id },
          include: { echeance: { include: INCLURE_ECHEANCE } },
        });
        if (p) {
          return {
            montant: p.montant,
            date: p.date.toISOString(),
            note: p.note ?? null,
            echeance: formatEcheanceLibelle(p.echeance.libelle, p.echeance.dateEcheance),
            eleve: p.echeance.user?.nom ?? null,
            formation: p.echeance.formation?.titre ?? null,
          };
        }
      }
      // Paiement pas (encore) créé : au moins l'échéance visée.
      const echeanceId = idParmi(params.id);
      return echeanceId ? contexteEcheance(prisma, echeanceId) : null;
    },
    libelle: (x) => joindre(fcfa(x.montant), chaine(x.eleve), chaine(x.echeance)),
  },

  /** Formateur (dont son salaire mensuel). */
  formateur: {
    // Changer (ou tenter de changer) le salaire mensuel est une opération
    // financière : rangée avec les salaires. Le reste du profil : formateurs.
    ressource: ({ avant, apres, corps }) => {
      const nouveau = apres?.salaireMensuel ?? corps.salaireMensuel;
      return avant && nouveau !== undefined && nouveau !== avant.salaireMensuel
        ? 'salaires'
        : 'formateurs';
    },
    async lire(prisma, params, reponse): Promise<Instantane | null> {
      const id = idParmi(params.id, idDeReponse(reponse));
      if (!id) return null;
      const f = await prisma.formateur.findUnique({
        where: { id },
        select: { nom: true, email: true, specialite: true, salaireMensuel: true, actif: true },
      });
      return f ? { ...f } : null;
    },
    libelle: (x) => chaine(x.nom) ?? '',
  },

  /** Fiche de salaire mensuelle d'un formateur. */
  ficheSalaire: {
    ressource: 'salaires',
    async lire(prisma, params, reponse): Promise<Instantane | null> {
      const id = idParmi(params.ficheId, idDeReponse(reponse));
      if (id) {
        const fiche = await contexteFiche(prisma, id);
        if (fiche) return fiche;
      }
      // Fiche pas (encore) créée : au moins le formateur visé.
      const formateurId = idParmi(params.id);
      if (!formateurId) return null;
      const f = await prisma.formateur.findUnique({
        where: { id: formateurId },
        select: { nom: true },
      });
      return f ? { formateur: f.nom } : null;
    },
    libelle: (x) =>
      joindre(x.mois ? `Fiche ${String(x.mois)}` : null, fcfa(x.montantDu), chaine(x.formateur)),
  },

  /** Versement (paiement) d'une fiche de salaire. */
  versementSalaire: {
    ressource: 'salaires',
    async lire(prisma, params, reponse): Promise<Instantane | null> {
      const id = idParmi(params.vId, idDeReponse(reponse));
      if (id) {
        const v = await prisma.versementSalaire.findUnique({
          where: { id },
          include: { fiche: { include: { formateur: { select: { nom: true } } } } },
        });
        if (v) {
          return {
            montant: v.montant,
            date: v.date.toISOString(),
            note: v.note ?? null,
            fiche: v.fiche.mois,
            formateur: v.fiche.formateur?.nom ?? null,
          };
        }
      }
      // Versement pas (encore) créé : au moins la fiche visée.
      const ficheId = idParmi(params.ficheId);
      if (!ficheId) return null;
      const fiche = await contexteFiche(prisma, ficheId);
      return fiche ? { fiche: fiche.mois, formateur: fiche.formateur } : null;
    },
    libelle: (x) =>
      joindre(fcfa(x.montant), chaine(x.formateur), x.fiche ? `fiche ${String(x.fiche)}` : null),
  },
} satisfies Record<string, ContexteAudit>;

export type CleContexte = keyof typeof CONTEXTES_AUDIT;
