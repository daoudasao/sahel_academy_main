import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SupportService } from '../support/support.service';
import {
  Prisma,
  StatutAdmission,
  TypeNotification,
  StatutBourse,
} from '@prisma/client';
import { CreateBourseDto } from './dto/create-bourse.dto';
import { UpdateBourseDto } from './dto/update-bourse.dto';
import { CreateChampDto } from './dto/create-champ.dto';
import { CreateCandidatureDto } from './dto/create-candidature.dto';
import { UpdateCandidatureDto } from './dto/update-candidature.dto';
import { nomDe } from '../auth/roles.util';

/**
 * Champs réservés aux admis (message et document d'admission) : ils ne
 * figurent ni dans le catalogue public ni dans les candidatures non retenues.
 */
const CHAMPS_ADMISSION = {
  documentAdmissionUrl: true,
  documentAdmissionNom: true,
  messageAdmission: true,
} as const;

@Injectable()
export class BoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly supportService: SupportService,
  ) {}

  async create(createBourseDto: CreateBourseDto) {
    const { champs, ...data } = createBourseDto;
    const bourse = await this.prisma.bourse.create({
      data: {
        ...data,
        champs: champs && champs.length ? { create: champs } : undefined,
      },
      include: { champs: true },
    });

    if (bourse.statut === StatutBourse.ouverte) {
      try {
        await this.notificationsService.create({
          titre: 'Nouvelle bourse d\'études disponible ! 🎓',
          message: `La bourse "${bourse.titre}" est ouverte aux candidatures. Postulez dès maintenant !`,
          type: TypeNotification.actualite,
          cible: 'global',
          cibleId: bourse.id,
        });
      } catch (err) {
        console.error('Erreur lors de l\'envoi de la notification pour la nouvelle bourse:', err);
      }
    }

    return bourse;
  }

  /**
   * Catalogue des bourses. Le public ne voit jamais les brouillons
   * (`en_attente`) ni les champs d'admission ; l'équipe ([pourEquipe]) voit tout.
   */
  async findAll(
    statutFilter?: StatutBourse,
    inclureTous = false,
    pourEquipe = false,
  ) {
    // Le public ne voit que les bourses ouvertes : ni brouillons
    // (`en_attente`) ni clôturées (`fermee`). L'équipe voit tout.
    let filtreStatut: Prisma.BourseWhereInput;
    if (!pourEquipe) {
      filtreStatut = { statut: StatutBourse.ouverte };
    } else if (statutFilter) {
      filtreStatut = { statut: statutFilter };
    } else if (inclureTous) {
      filtreStatut = {};
    } else {
      filtreStatut = { statut: { not: StatutBourse.en_attente } };
    }

    try {
      return await this.prisma.bourse.findMany({
        where: filtreStatut,
        omit: pourEquipe ? undefined : CHAMPS_ADMISSION,
        include: {
          formation: true,
          departement: true,
          _count: {
            select: { candidatures: true, champs: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des bourses:', error);
      return [];
    }
  }

  /**
   * Détail d'une bourse (par id, ou par id de formation liée).
   * Les candidatures — données personnelles des candidats — ne sont incluses
   * que pour l'équipe ([avecCandidatures]).
   */
  async findOne(
    id: string,
    options: {
      avecCandidatures?: boolean;
      pourEquipe?: boolean;
      userId?: string;
    } = {},
  ) {
    const include: Prisma.BourseInclude = {
      champs: { orderBy: { ordre: 'asc' } },
      ...(options.avecCandidatures
        ? { candidatures: { include: { user: true } } }
        : {}),
    };
    const omit = options.avecCandidatures ? undefined : CHAMPS_ADMISSION;

    const bourse =
      (await this.prisma.bourse.findUnique({ where: { id }, include, omit })) ??
      (await this.prisma.bourse.findFirst({
        where: { formationId: id },
        include,
        omit,
      }));

    if (!bourse) throw new NotFoundException('Bourse non trouvée');

    // Une bourse non ouverte (clôturée ou brouillon) est invisible au public.
    // Exception : un candidat qui y a postulé garde l'accès (page « résultat »).
    if (!options.pourEquipe && bourse.statut !== StatutBourse.ouverte) {
      const estCandidat =
        !!options.userId &&
        (await this.prisma.candidature.count({
          where: { bourseId: bourse.id, userId: options.userId },
        })) > 0;
      if (!estCandidat) throw new NotFoundException('Bourse non trouvée');
    }

    return bourse;
  }

  async update(id: string, updateBourseDto: UpdateBourseDto) {
    // Les champs se gèrent via addChamp/removeChamp, on les ignore ici.
    const { champs: _champs, ...data } = updateBourseDto;
    try {
      const ancienneBourse = await this.prisma.bourse.findUnique({ where: { id } });
      const updated = await this.prisma.bourse.update({
        where: { id },
        data,
        include: { champs: true },
      });

      if (ancienneBourse && ancienneBourse.statut !== StatutBourse.ouverte && updated.statut === StatutBourse.ouverte) {
        try {
          await this.notificationsService.create({
            titre: 'Nouvelle bourse d\'études disponible ! 🎓',
            message: `La bourse "${updated.titre}" est désormais ouverte aux candidatures. Postulez dès maintenant !`,
            type: TypeNotification.actualite,
            cible: 'global',
            cibleId: updated.id,
          });
        } catch (err) {
          console.error('Erreur lors de l\'envoi de la notification de publication de bourse:', err);
        }
      }

      return updated;
    } catch {
      throw new NotFoundException('Bourse non trouvée');
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.bourse.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Bourse non trouvée');
    }
  }

  // ─── Champs de formulaire ───

  async addChamp(bourseId: string, dto: CreateChampDto) {
    await this.findOne(bourseId);
    return this.prisma.champFormulaire.create({
      data: { bourseId, ...dto },
    });
  }

  async removeChamp(champId: string) {
    try {
      return await this.prisma.champFormulaire.delete({ where: { id: champId } });
    } catch {
      throw new NotFoundException('Champ non trouvé');
    }
  }

  // ─── Candidatures ───

  async getCandidatures(bourseId: string) {
    return this.prisma.candidature.findMany({
      where: { bourseId },
      include: { user: true },
      orderBy: { dateDepot: 'desc' },
    });
  }

  // Candidatures d'un utilisateur donné (pour l'app mobile : « mes candidatures »).
  // Le message et le document d'admission ne sont joints qu'aux candidatures retenues,
  // et le gabarit de message d'admission est interpolé avec les données du candidat.
  async getCandidaturesForUser(userId: string) {
    const candidatures = await this.prisma.candidature.findMany({
      where: { userId },
      include: {
        bourse: { include: { formation: true } },
        user: true,
      },
      orderBy: { dateDepot: 'desc' },
    });

    return candidatures.map((c) => {
      if (c.statut === StatutAdmission.admis) {
        let messageAdmission = c.bourse?.messageAdmission;
        if (messageAdmission && messageAdmission.trim()) {
          const nomCompte = c.user?.nom || c.nom || 'Étudiant';
          const prenomCompte = nomCompte.trim().split(' ')[0] || nomCompte;
          const emailCompte = c.user?.email || c.email || '';
          const titreBourse = c.bourse?.titre || '';
          const dateStr = new Date(c.updatedAt || c.dateDepot || Date.now()).toLocaleDateString('fr-FR');

          messageAdmission = messageAdmission
            .replace(/\{nom\}/gi, nomCompte)
            .replace(/\{prenom\}/gi, prenomCompte)
            .replace(/\{email\}/gi, emailCompte)
            .replace(/\{bourse\}/gi, titreBourse)
            .replace(/\{date\}/gi, dateStr);
        }

        return {
          ...c,
          bourse: {
            ...c.bourse,
            messageAdmission,
          },
        };
      }

      const {
        documentAdmissionUrl: _url,
        documentAdmissionNom: _nom,
        messageAdmission: _message,
        ...bourse
      } = c.bourse;
      return { ...c, bourse };
    });
  }

  /**
   * Dépôt d'une candidature par l'utilisateur connecté.
   * L'identité vient toujours de la session, jamais du corps de la requête.
   */
  async createCandidature(
    idOrFormationId: string,
    dto: CreateCandidatureDto,
    user: {
      id: string;
      nom?: string | null;
      name?: string | null;
      email?: string | null;
    },
  ) {
    const bourse = await this.findOne(idOrFormationId);
    const bourseId = bourse.id;

    if (bourse.statut !== StatutBourse.ouverte) {
      throw new BadRequestException(
        "Cette bourse n'accepte pas de candidatures pour le moment.",
      );
    }
    // La date limite est inclusive : on accepte jusqu'à la fin de la journée.
    const finDateLimite = new Date(bourse.dateLimite);
    finDateLimite.setUTCHours(23, 59, 59, 999);
    if (Date.now() > finDateLimite.getTime()) {
      throw new BadRequestException(
        'La date limite de candidature est dépassée.',
      );
    }

    const existante = await this.prisma.candidature.findUnique({
      where: { bourseId_userId: { bourseId, userId: user.id } },
    });
    if (existante) {
      throw new ConflictException(
        existante.statut === StatutAdmission.enAttente
          ? 'Vous avez déjà une candidature en attente pour cette bourse'
          : 'Vous avez déjà candidaté à cette bourse',
      );
    }

    try {
      return await this.prisma.candidature.create({
        data: {
          bourseId,
          userId: user.id,
          nom: dto.nom?.trim() || nomDe(user) || 'Candidat',
          email: dto.email?.trim() || user.email || '',
          reponses: (dto.reponses ?? {}) as object,
        },
      });
    } catch (e) {
      // Deux envois simultanés : la contrainte d'unicité tranche.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Vous avez déjà candidaté à cette bourse');
      }
      throw e;
    }
  }

  async updateCandidatureStatut(candidatureId: string, dto: UpdateCandidatureDto) {
    try {
      const candidature = await this.prisma.candidature.update({
        where: { id: candidatureId },
        data: { statut: dto.statut },
        include: { bourse: true, user: true },
      });

      if (candidature.userId) {
        let titre = 'Mise à jour de votre candidature';
        let message = `Le statut de votre candidature à la bourse "${candidature.bourse.titre}" a changé.`;
        let documentUrl: string | undefined = undefined;
        let documentNom: string | undefined = undefined;

        if (dto.statut === StatutAdmission.admis) {
          titre = 'Candidature à la bourse acceptée ! 🎓';
          // IMPORTANT: Utiliser le nom du COMPTE utilisateur (user.nom) et non le nom saisi dans le formulaire
          const nomCompte = candidature.user?.nom || candidature.nom || 'Étudiant';
          const prenomCompte = nomCompte.trim().split(' ')[0] || nomCompte;
          const emailCompte = candidature.user?.email || candidature.email || '';
          const titreBourse = candidature.bourse.titre;
          const dateStr = new Date().toLocaleDateString('fr-FR');

          if (candidature.bourse.messageAdmission && candidature.bourse.messageAdmission.trim()) {
            message = candidature.bourse.messageAdmission
              .replace(/\{nom\}/gi, nomCompte)
              .replace(/\{prenom\}/gi, prenomCompte)
              .replace(/\{email\}/gi, emailCompte)
              .replace(/\{bourse\}/gi, titreBourse)
              .replace(/\{date\}/gi, dateStr);
          } else {
            message = `Félicitations ${nomCompte} ! Votre candidature pour la bourse "${titreBourse}" a été retenue.`;
          }

          if (candidature.bourse.documentAdmissionUrl) {
            documentUrl = candidature.bourse.documentAdmissionUrl;
            documentNom = candidature.bourse.documentAdmissionNom || 'Document_Admission.pdf';
          }

          // Envoi automatique dans le CHAT SUPPORT de l'utilisateur
          try {
            let messageChatSupport = message;
            if (documentUrl) {
              messageChatSupport += `\n\n📄 Document joint d'admission : ${documentNom}\n${documentUrl}`;
            }

            await this.supportService.sendAsSupport(candidature.userId, {
              contenu: messageChatSupport,
              type: documentUrl ? 'document' : 'texte',
              documentUrl,
              documentNom,
            });
          } catch (errSupport) {
            console.error('Erreur lors de l\'envoi du message d\'admission dans le chat support:', errSupport);
          }

        } else if (dto.statut === StatutAdmission.refuse) {
          titre = 'Mise à jour de votre demande de bourse';
          message = `Votre candidature pour la bourse "${candidature.bourse.titre}" n'a pas été retenue.`;
        }

        try {
          await this.notificationsService.create({
            userId: candidature.userId,
            type: TypeNotification.classe,
            titre,
            message,
            cible: 'bourse',
            cibleId: candidature.bourseId,
            cibleNom: candidature.bourse.titre,
            documentUrl,
            documentNom,
          });
        } catch (e) {
          console.error('Erreur notification bourse:', e);
        }
      }

      return candidature;
    } catch {
      throw new NotFoundException('Candidature non trouvée');
    }
  }
}
