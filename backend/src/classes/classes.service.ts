import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role, TypeNotification } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateCommentaireClasseDto } from './dto/create-commentaire.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import {
  CIBLE_DISCUSSION,
  NotificationsService,
} from '../notifications/notifications.service';
import {
  aUnRole,
  auteurDeCommentaire,
  estEquipe,
  nomDe,
} from '../auth/roles.util';

/** Champs du formateur visibles par les élèves (jamais le salaire ni les contacts). */
const FORMATEUR_PUBLIC = {
  id: true,
  nom: true,
  specialite: true,
  userId: true,
} as const;

/** Rôles qui gèrent le contenu de toutes les classes (alignés sur le dashboard). */
export const ROLES_GESTION_CLASSES: Role[] = [
  Role.CHEF_CENTRE,
  Role.STAFF,
  Role.RESPONSABLE_PEDAGOGIQUE,
];

/** Inscriptions qui ne donnent plus accès à la classe. */
const INSCRIPTIONS_INACTIVES = ['suspendu', 'abandonne'];

/** Extrait d'un texte pour le corps d'une notification. */
function extrait(texte: string, max = 140): string {
  const propre = texte.replace(/\s+/g, ' ').trim();
  return propre.length > max
    ? `${propre.slice(0, max - 1).trimEnd()}…`
    : propre;
}

type Utilisateur = {
  id: string;
  role?: string | null;
  nom?: string | null;
  name?: string | null;
};

@Injectable()
export class ClassesService {
  private readonly logger = new Logger(ClassesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Contrôle d'accès ───

  /**
   * Une classe est lisible par l'équipe, le formateur de la formation et les
   * élèves inscrits. En écriture (publier, supprimer) : la gestion
   * ([ROLES_GESTION_CLASSES]) et le formateur de la formation uniquement.
   */
  private async verifierAcces(
    formationId: string,
    user: Utilisateur,
    ecriture = false,
  ) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      select: { formateur: { select: { userId: true } } },
    });
    if (!formation) throw new NotFoundException('Classe non trouvée');

    if (aUnRole(user, ROLES_GESTION_CLASSES)) return;

    const estSonFormateur =
      user.role === Role.FORMATEUR &&
      !!formation.formateur?.userId &&
      formation.formateur.userId === user.id;
    if (estSonFormateur) return;

    if (!ecriture) {
      if (estEquipe(user)) return;
      const inscription = await this.prisma.inscription.findUnique({
        where: { userId_formationId: { userId: user.id, formationId } },
        select: { userId: true },
      });
      if (inscription) return;
    }

    throw new ForbiddenException("Vous n'avez pas accès à cette classe.");
  }

  private async formationDuMessage(messageId: string) {
    const message = await this.prisma.classeMessage.findUnique({
      where: { id: messageId },
      select: { formationId: true },
    });
    if (!message) throw new NotFoundException('Message non trouvé');
    return message.formationId;
  }

  // ─── Messages (flux) ───

  async getMessages(formationId: string, user: Utilisateur) {
    await this.verifierAcces(formationId, user);
    return this.prisma.classeMessage.findMany({
      where: { formationId },
      include: {
        commentaires: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMessage(
    formationId: string,
    dto: CreateMessageDto,
    user: Utilisateur,
  ) {
    // Vérifier l'accès à la classe (élève inscrit, formateur du cours ou gestion)
    await this.verifierAcces(formationId, user, false);

    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      select: { formateur: { select: { userId: true } } },
    });

    const gestion = aUnRole(user, ROLES_GESTION_CLASSES);
    const estSonFormateur =
      user.role === Role.FORMATEUR &&
      !!formation?.formateur?.userId &&
      formation.formateur.userId === user.id;

    let auteurNom = nomDe(user);
    let auteurRole = 'Élève';

    if (gestion) {
      auteurNom = dto.auteurNom?.trim() || nomDe(user) || 'Sahel Academy';
      auteurRole = dto.auteurRole ?? 'Équipe';
    } else if (estSonFormateur) {
      auteurNom = nomDe(user) || 'Formateur';
      auteurRole = 'Formateur';
    } else {
      auteurNom = nomDe(user) || 'Élève';
      auteurRole = 'Élève';
    }

    const message = await this.prisma.classeMessage.create({
      data: {
        formationId,
        auteurId: user.id,
        auteurNom,
        auteurRole,
        contenu: dto.contenu,
        documentNom: dto.documentNom,
      },
      include: { commentaires: true },
    });

    // En arrière-plan : la publication n'attend pas l'envoi des push.
    void this.notifierNouveauMessage(message, user.id);
    return message;
  }

  async removeMessage(id: string, user: Utilisateur) {
    const message = await this.prisma.classeMessage.findUnique({
      where: { id },
      select: { id: true, formationId: true, auteurNom: true },
    });
    if (!message) throw new NotFoundException('Message non trouvé');

    const nomUtilisateur = nomDe(user).trim().toLowerCase();
    const estAuteur =
      !!nomUtilisateur &&
      message.auteurNom.trim().toLowerCase() === nomUtilisateur;

    if (!estAuteur) {
      // Si l'utilisateur n'est pas l'auteur, il doit être formateur du cours ou de l'équipe de gestion
      await this.verifierAcces(message.formationId, user, true);
    } else {
      // L'auteur doit au minimum avoir accès à la classe
      await this.verifierAcces(message.formationId, user, false);
    }

    return this.prisma.classeMessage.delete({ where: { id } });
  }

  async addCommentaire(
    messageId: string,
    dto: CreateCommentaireClasseDto,
    user: Utilisateur,
  ) {
    await this.verifierAcces(await this.formationDuMessage(messageId), user);

    const { auteur, role } = auteurDeCommentaire(user, dto.auteur);
    const commentaire = await this.prisma.commentaireClasse.create({
      data: {
        messageId,
        auteurId: user.id,
        auteur,
        role,
        contenu: dto.contenu.trim(),
      },
    });

    void this.notifierReponse(messageId, commentaire, user.id);
    return commentaire;
  }

  // ─── Notifications de discussion ───

  /**
   * Nouveau message : prévient les membres de la classe (élèves inscrits
   * actifs et formateur), sauf l'auteur. Ne lève jamais.
   */
  private async notifierNouveauMessage(
    message: {
      id: string;
      formationId: string;
      auteurNom: string;
      contenu: string;
      documentNom: string | null;
    },
    auteurId: string,
  ) {
    try {
      const formation = await this.prisma.formation.findUnique({
        where: { id: message.formationId },
        select: {
          titre: true,
          formateur: { select: { userId: true } },
          inscriptions: {
            where: { statut: { notIn: INSCRIPTIONS_INACTIVES } },
            select: { userId: true },
          },
        },
      });
      if (!formation) return;

      const destinataires = [
        ...formation.inscriptions.map((i) => i.userId),
        formation.formateur?.userId,
      ].filter((id): id is string => !!id && id !== auteurId);

      const texte =
        extrait(message.contenu) ||
        (message.documentNom ? `📎 ${message.documentNom}` : 'Nouveau message');
      await this.notifications.creerPourUtilisateurs(destinataires, {
        type: TypeNotification.classe,
        titre: `Nouveau message · ${formation.titre}`,
        message: `${message.auteurNom} : ${texte}`,
        cible: CIBLE_DISCUSSION,
        cibleId: message.formationId,
        cibleNom: formation.titre,
        envoyePar: message.auteurNom,
        route: `/classe/${message.formationId}/message/${message.id}`,
      });
    } catch (e) {
      this.logger.error(
        `Notification du message ${message.id} non envoyée`,
        (e as Error)?.stack,
      );
    }
  }

  /**
   * Réponse à un message : prévient l'auteur du message et ceux qui y ont
   * déjà répondu, sauf l'auteur de la réponse. Ne lève jamais.
   */
  private async notifierReponse(
    messageId: string,
    commentaire: { auteur: string; contenu: string },
    auteurId: string,
  ) {
    try {
      const message = await this.prisma.classeMessage.findUnique({
        where: { id: messageId },
        select: {
          formationId: true,
          auteurId: true,
          auteurRole: true,
          formation: {
            select: { titre: true, formateur: { select: { userId: true } } },
          },
          commentaires: {
            where: { auteurId: { not: null } },
            select: { auteurId: true },
          },
        },
      });
      if (!message) return;

      // Message antérieur à l'enregistrement de l'auteur : s'il vient du
      // formateur, c'est lui qu'on prévient.
      const auteurMessage =
        message.auteurId ??
        (message.auteurRole === 'Formateur'
          ? message.formation.formateur?.userId
          : null);

      const destinataires = [
        auteurMessage,
        ...message.commentaires.map((c) => c.auteurId),
      ].filter((id): id is string => !!id && id !== auteurId);

      await this.notifications.creerPourUtilisateurs(destinataires, {
        type: TypeNotification.classe,
        titre: `Nouvelle réponse · ${message.formation.titre}`,
        message: `${commentaire.auteur} : ${extrait(commentaire.contenu)}`,
        cible: CIBLE_DISCUSSION,
        cibleId: message.formationId,
        cibleNom: message.formation.titre,
        envoyePar: commentaire.auteur,
        route: `/classe/${message.formationId}/message/${messageId}`,
      });
    } catch (e) {
      this.logger.error(
        `Notification de la réponse au message ${messageId} non envoyée`,
        (e as Error)?.stack,
      );
    }
  }

  // ─── Documents (cours) ───

  async getDocuments(formationId: string, user: Utilisateur) {
    await this.verifierAcces(formationId, user);
    return this.prisma.documentCours.findMany({
      where: { formationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDocument(
    formationId: string,
    dto: CreateDocumentDto,
    user: Utilisateur,
  ) {
    await this.verifierAcces(formationId, user, true);
    return this.prisma.documentCours.create({
      data: {
        formationId,
        titre: dto.titre,
        type: dto.type ?? 'PDF',
        url: dto.url,
        taille: dto.taille,
      },
    });
  }

  async removeDocument(id: string, user: Utilisateur) {
    const document = await this.prisma.documentCours.findUnique({
      where: { id },
      select: { formationId: true },
    });
    if (!document) throw new NotFoundException('Document non trouvé');
    await this.verifierAcces(document.formationId, user, true);
    return this.prisma.documentCours.delete({ where: { id } });
  }

  // ─── Classes de l'utilisateur (inscrit ou formateur) ───

  async getMesClasses(user: Utilisateur) {
    const formateur = await this.prisma.formateur.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    const formationsEnseignees = formateur
      ? await this.prisma.formation.findMany({
          where: { formateurId: formateur.id },
          include: {
            departement: true,
            formateur: { select: FORMATEUR_PUBLIC },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const inscriptions = await this.prisma.inscription.findMany({
      where: {
        userId: user.id,
        statut: { notIn: ['suspendu', 'abandonne'] },
      },
      include: {
        formation: {
          include: {
            departement: true,
            formateur: { select: FORMATEUR_PUBLIC },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const idsVus = new Set<string>();
    const resultat: any[] = [];

    for (const f of formationsEnseignees) {
      idsVus.add(f.id);
      resultat.push({
        ...f,
        estFormateur: true,
      });
    }

    for (const ins of inscriptions) {
      if (ins.formation && !idsVus.has(ins.formation.id)) {
        idsVus.add(ins.formation.id);
        resultat.push({
          ...ins.formation,
          estFormateur: false,
          statutInscription: ins.statut,
        });
      }
    }

    return resultat;
  }
}
