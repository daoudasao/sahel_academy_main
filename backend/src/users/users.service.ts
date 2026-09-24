import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { definirMotDePasse } from '../auth/mot-de-passe';
import { PaiementsService } from '../paiements/paiements.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paiementsService: PaiementsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  async findAll(role?: Role) {
    const users = await this.prisma.user.findMany({
      where: role ? { role } : undefined,
      // Fournisseurs de connexion (google, credential…) : on n'expose que le
      // nom du fournisseur, jamais les jetons ni le mot de passe.
      include: { accounts: { select: { providerId: true } } },
    });
    return users.map(({ accounts, ...user }) => ({
      ...user,
      providers: [...new Set(accounts.map((a) => a.providerId))],
    }));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }

  /**
   * Réinitialise le mot de passe d'un utilisateur (action d'administration).
   *
   * Délègue à better-auth (`setUserPassword`) : le hachage et la vérification
   * du rôle administrateur de l'appelant y sont gérés. Les en-têtes de la
   * requête (cookie de session ou bearer) sont transmis pour cette
   * vérification, en plus de la garde `Roles(CHEF_CENTRE)` du contrôleur.
   */
  async setPassword(userId: string, newPassword: string) {
    await this.findOne(userId); // 404 explicite si l'utilisateur n'existe pas

    // L'autorisation (rôle CHEF_CENTRE) est assurée par la garde du contrôleur ; on
    // écrit ici directement via better-auth (hachage + compte « credential »),
    // en reproduisant ce que fait le plugin admin, sans son contrôle de
    // permissions interne.
    try {
      await definirMotDePasse(userId, newPassword);
      return { success: true };
    } catch (e) {
      this.logger.error(
        `Échec du changement de mot de passe pour ${userId}`,
        (e as Error)?.stack,
      );
      throw new BadRequestException(
        'Impossible de définir le mot de passe pour ce compte.',
      );
    }
  }

  async update(id: string, updateUserDto: any) {
    const dataToUpdate: any = { ...updateUserDto };
    if (updateUserDto.name && !dataToUpdate.nom) dataToUpdate.nom = updateUserDto.name;
    if (updateUserDto.avatarUrl && !dataToUpdate.image) dataToUpdate.image = updateUserDto.avatarUrl;

    // Nettoyage des propriétés frontend qui n'existent pas dans le modèle Prisma User
    delete dataToUpdate.avatarUrl;
    delete dataToUpdate.name;

    // On trace les champs modifiés, jamais leurs valeurs (données personnelles).
    this.logger.log(
      `Mise à jour utilisateur ${id} : ${Object.keys(dataToUpdate).join(', ') || 'aucun champ'}`,
    );

    try {
      return await this.prisma.user.update({
        where: { id },
        data: dataToUpdate,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') throw new NotFoundException('Utilisateur non trouvé');
        if (e.code === 'P2002') throw new ConflictException('Cet e-mail est déjà utilisé.');
      }
      this.logger.error(`Échec de la mise à jour de l'utilisateur ${id}`, (e as Error)?.stack);
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (e) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
  }

  async getInscriptions(id: string) {
    return this.prisma.inscription.findMany({
      where: { userId: id },
      include: { formation: true },
    });
  }

  async inscrire(userId: string, dto: { formationId: string }) {
    let inscription;
    try {
      inscription = await this.prisma.$transaction(async (tx) => {
        const creee = await tx.inscription.create({
          data: {
            userId,
            formationId: dto.formationId,
            statut: 'en_cours',
          },
          include: { formation: { select: { titre: true } } },
        });

        await this.paiementsService.generateMissingEcheances(userId, tx);

        return creee;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ConflictException('Cet utilisateur est déjà inscrit à cette formation.');
        }
        if (e.code === 'P2003') {
          throw new NotFoundException('Utilisateur ou formation introuvable.');
        }
      }
      throw e;
    }

    // Prévenir l'élève (in-app, temps réel et push). Un échec d'envoi
    // n'annule pas l'inscription.
    const titre = inscription.formation.titre;
    try {
      await this.notificationsService.create({
        userId,
        type: 'classe',
        titre: 'Vous avez été inscrit à une formation',
        message: `Vous avez été inscrit à la formation "${titre}". Vous avez désormais accès à sa classe : annonces, documents et échanges avec votre formateur.`,
        cible: 'classe',
        cibleId: dto.formationId,
        cibleNom: titre,
      });
    } catch (e) {
      this.logger.error(
        `Notification d'inscription non envoyée (${userId})`,
        (e as Error)?.stack,
      );
    }

    return inscription;
  }

  async getCandidatures(userId: string) {
    return this.prisma.candidature.findMany({
      where: { userId },
      include: { bourse: true },
    });
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { fcmToken },
      });
      return { success: true };
    } catch (e) {
      this.logger.error(`Échec de l'enregistrement du token push pour ${userId}`, (e as Error)?.stack);
      throw new NotFoundException('Utilisateur non trouvé');
    }
  }

  async updateInscriptionStatus(userId: string, formationId: string, statut: string) {
    try {
      return await this.prisma.inscription.update({
        where: {
          userId_formationId: { userId, formationId },
        },
        data: { statut },
        include: { formation: true },
      });
    } catch (e) {
      throw new NotFoundException('Inscription non trouvée');
    }
  }

  async removeInscription(userId: string, formationId: string) {
    try {
      return await this.prisma.inscription.delete({
        where: {
          userId_formationId: { userId, formationId },
        },
      });
    } catch (e) {
      throw new NotFoundException('Inscription non trouvée');
    }
  }
}
