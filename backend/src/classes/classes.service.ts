import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateCommentaireClasseDto } from './dto/create-commentaire.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
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

type Utilisateur = {
  id: string;
  role?: string | null;
  nom?: string | null;
  name?: string | null;
};

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.classeMessage.create({
      data: {
        formationId,
        auteurNom,
        auteurRole,
        contenu: dto.contenu,
        documentNom: dto.documentNom,
      },
      include: { commentaires: true },
    });
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
    return this.prisma.commentaireClasse.create({
      data: {
        messageId,
        auteur,
        role,
        contenu: dto.contenu.trim(),
      },
    });
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
