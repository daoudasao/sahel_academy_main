import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Pourcentage appliqué quand la formation n'en définit pas. */
const POURCENTAGE_PAR_DEFAUT = 30;

/**
 * Espace personnel d'un formateur connecté : ses classes, ses apprenants,
 * ses gains et ses fiches de salaire. Tout est déduit de la session :
 * un formateur ne peut jamais consulter les données d'un autre.
 */
@Injectable()
export class EspaceFormateurService {
  constructor(private prisma: PrismaService) {}

  /** Fiche formateur rattachée au compte, ou 404 explicite. */
  private async formateurDuCompte(userId: string) {
    const formateur = await this.prisma.formateur.findUnique({
      where: { userId },
      select: {
        id: true,
        nom: true,
        email: true,
        telephone: true,
        specialite: true,
        salaireMensuel: true,
        actif: true,
      },
    });
    if (!formateur) {
      throw new NotFoundException(
        "Votre compte n'est pas encore rattaché à une fiche formateur. Contactez l'administration.",
      );
    }
    return formateur;
  }

  async tableauDeBord(userId: string) {
    const formateur = await this.formateurDuCompte(userId);

    const [formations, fiches] = await Promise.all([
      this.prisma.formation.findMany({
        where: { formateurId: formateur.id },
        select: {
          id: true,
          titre: true,
          imageUrl: true,
          statut: true,
          departementId: true,
          pourcentageFormateur: true,
          departement: { select: { id: true, nom: true } },
          _count: {
            select: {
              inscriptions: {
                where: { statut: { notIn: ['suspendu', 'abandonne'] } },
              },
              classeMessages: true,
              documentsCours: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ficheSalaire.findMany({
        where: { formateurId: formateur.id },
        include: { versements: { orderBy: { date: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Encaissements par formation, calculés en base (pas de détail élève).
    const encaissements = formations.length
      ? await this.prisma.echeance.groupBy({
          by: ['formationId'],
          where: { formationId: { in: formations.map((f) => f.id) } },
          _sum: { montantPaye: true },
        })
      : [];
    const encaisseParFormation = new Map(
      encaissements.map((e) => [e.formationId, e._sum.montantPaye ?? 0]),
    );

    let totalEncaissements = 0;
    let totalGains = 0;
    const classes = formations.map((f) => {
      const encaisse = encaisseParFormation.get(f.id) ?? 0;
      const pourcentage = f.pourcentageFormateur ?? POURCENTAGE_PAR_DEFAUT;
      const gain = Math.round(encaisse * (pourcentage / 100));
      totalEncaissements += encaisse;
      totalGains += gain;
      return {
        id: f.id,
        titre: f.titre,
        imageUrl: f.imageUrl,
        statut: f.statut,
        departementId: f.departementId,
        departementNom: f.departement?.nom ?? null,
        apprenants: f._count.inscriptions,
        messages: f._count.classeMessages,
        documents: f._count.documentsCours,
        pourcentage,
        encaissements: encaisse,
        gain,
      };
    });

    let totalSalaireDu = 0;
    let totalSalaireVerse = 0;
    const salaires = fiches.map((fiche) => {
      const verse = fiche.versements.reduce((s, v) => s + v.montant, 0);
      totalSalaireDu += fiche.montantDu;
      totalSalaireVerse += verse;
      return {
        id: fiche.id,
        mois: fiche.mois,
        montantDu: fiche.montantDu,
        montantVerse: verse,
        reste: Math.max(0, fiche.montantDu - verse),
        statut:
          verse <= 0 ? 'impaye' : verse >= fiche.montantDu ? 'paye' : 'partiel',
        createdAt: fiche.createdAt,
        versements: fiche.versements.map((v) => ({
          id: v.id,
          montant: v.montant,
          date: v.date,
          note: v.note,
        })),
      };
    });

    return {
      formateur,
      resume: {
        classes: classes.length,
        apprenants: classes.reduce((s, c) => s + c.apprenants, 0),
        totalEncaissements,
        totalGains,
        totalSalaireDu,
        totalSalaireVerse,
        resteSalaire: Math.max(0, totalSalaireDu - totalSalaireVerse),
      },
      classes,
      salaires,
    };
  }

  /** Apprenants d'une classe du formateur (sans coordonnées ni paiements). */
  async apprenants(userId: string, formationId: string) {
    const formateur = await this.formateurDuCompte(userId);
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      select: { formateurId: true },
    });
    if (!formation) throw new NotFoundException('Classe introuvable.');
    if (formation.formateurId !== formateur.id) {
      throw new ForbiddenException("Cette classe n'est pas la vôtre.");
    }

    const inscriptions = await this.prisma.inscription.findMany({
      where: { formationId },
      select: {
        id: true,
        statut: true,
        dateInscription: true,
        user: { select: { id: true, nom: true, image: true } },
      },
      orderBy: { dateInscription: 'asc' },
    });

    return inscriptions.map((i) => ({
      id: i.id,
      userId: i.user.id,
      nom: i.user.nom,
      image: i.user.image,
      statut: i.statut,
      dateInscription: i.dateInscription,
    }));
  }
}
