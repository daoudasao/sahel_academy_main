import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '@prisma/client';
import { CreateEcheanceDto } from './dto/create-echeance.dto';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { UpdatePaiementDto } from './dto/update-paiement.dto';
import { formatEcheanceLibelle } from './echeance-libelle';

/** Champs de l'utilisateur joints à une échéance (pas de token ni d'infos de bannissement). */
const USER_ECHEANCE = {
  id: true,
  nom: true,
  email: true,
  telephone: true,
  image: true,
} as const;

@Injectable()
export class PaiementsService implements OnModuleInit {
  private readonly logger = new Logger(PaiementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Correction ponctuelle des anciens libellés « Mensualité 1/2 », faite une
   * fois au démarrage plutôt qu'à chaque lecture. Les libellés sont de toute
   * façon reformatés à l'affichage (voir formatEcheanceLibelle).
   */
  onModuleInit() {
    void this.normaliserAnciensLibelles().catch((e) =>
      this.logger.warn(`Normalisation des libellés ignorée : ${String(e)}`),
    );
  }

  private async normaliserAnciensLibelles() {
    const anciennes = await this.prisma.echeance.findMany({
      where: { libelle: { contains: '/' } },
      select: { id: true, libelle: true, dateEcheance: true },
    });
    for (const e of anciennes) {
      const libelle = this.formatEcheanceLibelle(e.libelle, e.dateEcheance);
      if (libelle !== e.libelle) {
        await this.prisma.echeance.update({
          where: { id: e.id },
          data: { libelle },
        });
      }
    }
  }

  async createEcheance(createEcheanceDto: CreateEcheanceDto) {
    return this.prisma.echeance.create({
      data: createEcheanceDto,
    });
  }

  async generateMissingEcheances(userId?: string, txClient?: any) {
    const db = txClient || this.prisma;
    const inscriptions = await db.inscription.findMany({
      where: {
        ...(userId && { userId }),
        formation: { estBourse: false },
      },
      include: { formation: true },
    });
    if (inscriptions.length === 0) return;

    // Une seule requête pour savoir quelles inscriptions ont déjà un échéancier.
    const existants: { userId: string; formationId: string }[] =
      await db.echeance.groupBy({
        by: ['userId', 'formationId'],
        where: userId ? { userId } : undefined,
      });
    const dejaGeneres = new Set(
      existants.map((e) => `${e.userId}|${e.formationId}`),
    );

    for (const ins of inscriptions) {
      if (!dejaGeneres.has(`${ins.userId}|${ins.formationId}`)) {
        const formation = ins.formation;
        const startDate = new Date(ins.dateInscription || Date.now());

        if (formation.prixInscription > 0) {
          await db.echeance.create({
            data: {
              userId: ins.userId,
              formationId: ins.formationId,
              libelle: "Frais d'inscription",
              montantDu: formation.prixInscription,
              dateEcheance: startDate,
            },
          });
        }

        const duree = Math.max(1, formation.dureeMois || 1);
        const prixMensuel = formation.prixMensualite || 0;

        if (prixMensuel > 0) {
          for (let month = 1; month <= duree; month++) {
            const dateEch = new Date(startDate);
            dateEch.setMonth(dateEch.getMonth() + (month - 1));

            const monthName = dateEch.toLocaleDateString('fr-FR', {
              month: 'long',
              year: 'numeric',
            });
            const formattedMonth =
              monthName.charAt(0).toUpperCase() + monthName.slice(1);

            const libelle =
              duree === 1 ? 'Frais de scolarité' : `Mensualité - ${formattedMonth}`;
            await db.echeance.create({
              data: {
                userId: ins.userId,
                formationId: ins.formationId,
                libelle,
                montantDu: prixMensuel,
                dateEcheance: dateEch,
              },
            });
          }
        }
      }
    }
  }

  private formatEcheanceLibelle(libelle: string, dateEcheance?: Date | string | null): string {
    return formatEcheanceLibelle(libelle, dateEcheance);
  }

  async findAllEcheances(userId?: string, formationId?: string) {
    await this.generateMissingEcheances(userId);

    const echeances = await this.prisma.echeance.findMany({
      where: {
        ...(userId && { userId }),
        ...(formationId && { formationId }),
      },
      include: {
        user: { select: USER_ECHEANCE },
        formation: true,
        paiements: true,
      },
    });

    return echeances.map((e) => ({
      ...e,
      libelle: this.formatEcheanceLibelle(e.libelle, e.dateEcheance),
    }));
  }

  async findEcheance(id: string) {
    const echeance = await this.prisma.echeance.findUnique({
      where: { id },
      include: { paiements: true },
    });
    if (!echeance) throw new NotFoundException('Échéance non trouvée');
    return {
      ...echeance,
      libelle: this.formatEcheanceLibelle(echeance.libelle, echeance.dateEcheance),
    };
  }

  async addPaiement(echeanceId: string, createPaiementDto: CreatePaiementDto) {
    const echeance = await this.findEcheance(echeanceId);
    
    // Add paiement and update echeance montantPaye
    const paiement = await this.prisma.paiementHistorique.create({
      data: {
        echeanceId,
        montant: createPaiementDto.montant,
        note: createPaiementDto.note,
        date: new Date(),
      },
    });

    await this.prisma.echeance.update({
      where: { id: echeanceId },
      data: {
        montantPaye: {
          increment: createPaiementDto.montant,
        },
        datePaiement: new Date(),
      },
    });

    if (echeance.userId) {
      try {
        const libelleAffiche = this.formatEcheanceLibelle(echeance.libelle, echeance.dateEcheance);
        await this.notificationsService.create({
          userId: echeance.userId,
          type: TypeNotification.paiement,
          titre: 'Paiement enregistré',
          message: `Votre paiement de ${createPaiementDto.montant} FCFA pour "${libelleAffiche}" a bien été enregistré.`,
          cible: 'paiement',
          cibleId: echeance.id,
        });
      } catch (err) {
        console.error('Erreur notification paiement:', err);
      }
    }

    return paiement;
  }

  async removePaiement(id: string) {
    try {
      const paiement = await this.prisma.paiementHistorique.delete({
        where: { id },
      });
      // Deduct from echeance
      await this.prisma.echeance.update({
        where: { id: paiement.echeanceId },
        data: {
          montantPaye: {
            decrement: paiement.montant,
          },
        },
      });
      return paiement;
    } catch (e) {
      throw new NotFoundException('Paiement non trouvé');
    }
  }

  async updatePaiement(id: string, updatePaiementDto: UpdatePaiementDto) {
    const existingPaiement = await this.prisma.paiementHistorique.findUnique({
      where: { id },
    });

    if (!existingPaiement) {
      throw new NotFoundException('Paiement non trouvé');
    }

    const { montant, note } = updatePaiementDto;
    
    let diff = 0;
    if (montant !== undefined && montant !== existingPaiement.montant) {
      diff = montant - existingPaiement.montant;
    }

    const updatedPaiement = await this.prisma.paiementHistorique.update({
      where: { id },
      data: {
        ...(montant !== undefined && { montant }),
        ...(note !== undefined && { note }),
      },
    });

    if (diff !== 0) {
      await this.prisma.echeance.update({
        where: { id: updatedPaiement.echeanceId },
        data: {
          montantPaye: {
            increment: diff,
          },
        },
      });
    }

    return updatedPaiement;
  }
}
