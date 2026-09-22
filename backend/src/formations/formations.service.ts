import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { StatutFormation } from '@prisma/client';
import { SupportService } from '../support/support.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaiementsService } from '../paiements/paiements.service';

/** Seuls champs du formateur visibles publiquement. */
const FORMATEUR_PUBLIC = {
  id: true,
  nom: true,
  specialite: true,
  userId: true,
} as const;

@Injectable()
export class FormationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supportService: SupportService,
    private readonly notificationsService: NotificationsService,
    private readonly paiementsService: PaiementsService,
  ) {}

  async create(createFormationDto: CreateFormationDto) {
    return this.prisma.formation.create({
      data: createFormationDto,
    });
  }

  /**
   * Catalogue. Le public ne reçoit du formateur que son nom et sa spécialité
   * (ni salaire, ni coordonnées) ; l'équipe ([pourEquipe]) reçoit la fiche complète.
   */
  async findAll(
    departementId?: string,
    statut?: StatutFormation,
    pourEquipe = false,
  ) {
    return this.prisma.formation.findMany({
      where: {
        ...(departementId && { departementId }),
        ...(statut && { statut }),
      },
      include: {
        departement: true,
        formateur: pourEquipe ? true : { select: FORMATEUR_PUBLIC },
        _count: {
          select: { inscriptions: true, demandesInscriptions: true },
        },
      },
    });
  }

  /**
   * Détail d'une formation. Les inscrits et les demandes (données personnelles)
   * ne sont inclus que pour l'équipe ([pourEquipe]).
   */
  async findOne(id: string, pourEquipe = false) {
    const formation = pourEquipe
      ? await this.prisma.formation.findUnique({
          where: { id },
          include: {
            departement: true,
            formateur: true,
            inscriptions: { include: { user: true } },
            demandesInscriptions: { include: { user: true } },
          },
        })
      : await this.prisma.formation.findUnique({
          where: { id },
          include: {
            departement: true,
            formateur: { select: FORMATEUR_PUBLIC },
            _count: { select: { inscriptions: true } },
          },
        });
    if (!formation) throw new NotFoundException('Formation non trouvée');
    return formation;
  }

  async update(id: string, updateFormationDto: UpdateFormationDto) {
    try {
      return await this.prisma.formation.update({
        where: { id },
        data: updateFormationDto,
      });
    } catch (e) {
      throw new NotFoundException('Formation non trouvée');
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.formation.delete({
        where: { id },
      });
    } catch (e) {
      throw new NotFoundException('Formation non trouvée');
    }
  }

  // ─── Demandes d'inscription (Workflow Utilisateur ↔ Admin) ───

  /// Un élève signale son intérêt pour rejoindre une formation.
  async creerDemande(formationId: string, userId: string) {
    const formation = await this.prisma.formation.findUnique({ where: { id: formationId } });
    if (!formation) throw new NotFoundException('Formation non trouvée');

    const demande = await this.prisma.demandeInscription.upsert({
      where: { userId_formationId: { userId, formationId } },
      create: { userId, formationId, statut: 'en_attente' },
      update: { statut: 'en_attente' },
      include: { formation: true, user: true },
    });

    // Envoi automatique d'un message dans le fil support du client
    try {
      await this.supportService.sendAsClient(userId, {
        contenu: `Bonjour Sahel Academy, je souhaite rejoindre la formation "${formation.titre}". Pouvons-nous échanger sur les modalités ?`,
        type: 'texte',
      });
    } catch (err) {
      console.error('Erreur envoi message automatique support:', err);
    }

    return demande;
  }

  /// Obtenir les demandes d'inscription d'un utilisateur donné
  async getDemandesForUser(userId: string) {
    return this.prisma.demandeInscription.findMany({
      where: { userId },
      include: {
        formation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /// Obtenir toutes les demandes d'inscription pour l'administrateur
  async getDemandes() {
    return this.prisma.demandeInscription.findMany({
      include: {
        user: true,
        formation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /// L'administrateur valide la demande :
  /// - Inscrit directement l'élève au cours s'il ne l'est pas encore + notifie l'élève.
  /// - Si l'élève est DÉJÀ inscrit au cours, on met à jour seulement le statut de la demande en "valide" et on avertit l'admin.
  async validerDemande(demandeId: string) {
    const demande = await this.prisma.demandeInscription.findUnique({
      where: { id: demandeId },
      include: { formation: true, user: true },
    });
    if (!demande) throw new NotFoundException('Demande non trouvée');

    // Vérification si l'élève est déjà inscrit au cours
    const inscriptionExistante = await this.prisma.inscription.findUnique({
      where: {
        userId_formationId: {
          userId: demande.userId,
          formationId: demande.formationId,
        },
      },
    });

    let dejaInscrit = false;

    if (!inscriptionExistante) {
      // 1. Inscrit directement l'utilisateur au cours
      await this.prisma.inscription.create({
        data: {
          userId: demande.userId,
          formationId: demande.formationId,
          statut: 'en_cours',
        },
      });

      await this.paiementsService.generateMissingEcheances(demande.userId);

      // 2. Avertit l'élève via notification in-app et message dans le chat support
      try {
        await this.notificationsService.create({
          userId: demande.userId,
          type: 'classe',
          titre: 'Inscription au cours validée',
          message: `Félicitations ! Votre inscription à la formation "${demande.formation.titre}" a été validée. Vous avez désormais accès aux cours.`,
          cible: 'classe',
          cibleId: demande.formationId,
          cibleNom: demande.formation.titre,
        });

        await this.supportService.sendAsSupport(demande.userId, {
          contenu: `Félicitations ${demande.user.nom} ! Votre inscription à la formation "${demande.formation.titre}" a été validée par l'administration. Vous avez désormais accès à vos cours et espaces de classe !`,
          type: 'texte',
        });
      } catch (err) {
        console.error('Erreur notification élève:', err);
      }
    } else {
      dejaInscrit = true;

      // Avertit l'administration via une notification système
      try {
        await this.notificationsService.create({
          type: 'systeme',
          titre: 'Demande validée (Déjà inscrit)',
          message: `L'élève ${demande.user.nom} (${demande.user.email}) était déjà inscrit à la formation "${demande.formation.titre}". La demande d'inscription a été marquée comme validée.`,
          cible: 'admin',
          envoyePar: 'Système',
        });
      } catch (err) {
        console.error('Erreur notification admin:', err);
      }
    }

    // 3. Met à jour le statut de la demande en "valide"
    const demandeMisAJour = await this.prisma.demandeInscription.update({
      where: { id: demandeId },
      data: { statut: 'valide' },
      include: { formation: true, user: true },
    });

    return {
      dejaInscrit,
      demande: demandeMisAJour,
      message: dejaInscrit
        ? `L'élève ${demande.user.nom} était déjà inscrit à cette formation. Le statut de la demande a été mis à jour et l'administration notifiée.`
        : `L'élève ${demande.user.nom} a été inscrit au cours et averti par notification et chat !`,
    };
  }

  /// L'administrateur marque la demande en refusée
  async refuserDemande(demandeId: string) {
    const demande = await this.prisma.demandeInscription.findUnique({
      where: { id: demandeId },
      include: { formation: true, user: true },
    });
    if (!demande) throw new NotFoundException('Demande non trouvée');

    const demandeMisAJour = await this.prisma.demandeInscription.update({
      where: { id: demandeId },
      data: { statut: 'refuse' },
      include: { formation: true, user: true },
    });

    try {
      await this.supportService.sendAsSupport(demande.userId, {
        contenu: `Information : Votre demande d'inscription pour la formation "${demande.formation.titre}" n'a pas été retenue pour le moment.`,
        type: 'texte',
      });
    } catch (err) {
      console.error('Erreur envoi message refus support:', err);
    }

    return demandeMisAJour;
  }
}
