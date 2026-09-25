import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Role,
  StatutSignalement,
  TypeNotification,
  TypeSignalement,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CIBLE_MODERATION,
  NotificationsService,
} from '../notifications/notifications.service';
import { ActualitesGateway } from '../actualites/actualites.gateway';
import { nomDe } from '../auth/roles.util';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { TraiterSignalementDto } from './dto/traiter-signalement.dto';

/** Rôles qui examinent les signalements depuis le dashboard (+ SUPER_ADMIN). */
export const ROLES_MODERATION: Role[] = [
  Role.CHEF_CENTRE,
  Role.STAFF,
  Role.RESPONSABLE_PEDAGOGIQUE,
  Role.COMMUNITY_MANAGER,
  Role.SUPPORT,
];

type Utilisateur = {
  id: string;
  role?: string | null;
  nom?: string | null;
  name?: string | null;
};

/** Copie du contenu signalé, figée au moment du signalement. */
type ContenuSignale = {
  auteurId: string | null;
  auteurNom: string;
  auteurRole: string | null;
  contenu: string;
  formationId: string | null;
  postId: string | null;
};

@Injectable()
export class SignalementsService {
  private readonly logger = new Logger(SignalementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly actualitesGateway: ActualitesGateway,
  ) {}

  // ─── Côté app : signaler ───

  /**
   * Enregistre le signalement. Signaler deux fois le même contenu ne crée
   * pas de doublon : le premier signalement est conservé.
   */
  async signaler(dto: CreateSignalementDto, user: Utilisateur) {
    const cible = await this.lireContenu(dto.type, dto.contenuId);
    if (!cible) throw new NotFoundException('Contenu introuvable ou supprimé');
    if (cible.auteurId && cible.auteurId === user.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas signaler votre propre message.',
      );
    }

    const signalement = await this.prisma.signalement.upsert({
      where: {
        type_contenuId_signaleParId: {
          type: dto.type,
          contenuId: dto.contenuId,
          signaleParId: user.id,
        },
      },
      update: {},
      create: {
        type: dto.type,
        contenuId: dto.contenuId,
        motif: dto.motif,
        details: dto.details?.trim() || null,
        signaleParId: user.id,
        ...cible,
      },
      select: { id: true, statut: true, createdAt: true },
    });
    return signalement;
  }

  private async lireContenu(
    type: TypeSignalement,
    id: string,
  ): Promise<ContenuSignale | null> {
    switch (type) {
      case TypeSignalement.message_classe: {
        const m = await this.prisma.classeMessage.findUnique({
          where: { id },
          select: {
            auteurId: true,
            auteurNom: true,
            auteurRole: true,
            contenu: true,
            documentNom: true,
            formationId: true,
          },
        });
        if (!m) return null;
        return {
          auteurId: m.auteurId,
          auteurNom: m.auteurNom,
          auteurRole: m.auteurRole,
          contenu: m.contenu || (m.documentNom ? `📎 ${m.documentNom}` : ''),
          formationId: m.formationId,
          postId: null,
        };
      }
      case TypeSignalement.commentaire_classe: {
        const c = await this.prisma.commentaireClasse.findUnique({
          where: { id },
          select: {
            auteurId: true,
            auteur: true,
            role: true,
            contenu: true,
            message: { select: { formationId: true } },
          },
        });
        if (!c) return null;
        return {
          auteurId: c.auteurId,
          auteurNom: c.auteur,
          auteurRole: c.role,
          contenu: c.contenu,
          formationId: c.message.formationId,
          postId: null,
        };
      }
      case TypeSignalement.commentaire_post: {
        const c = await this.prisma.commentaire.findUnique({
          where: { id },
          select: {
            auteurId: true,
            auteur: true,
            role: true,
            contenu: true,
            postId: true,
          },
        });
        if (!c) return null;
        return {
          auteurId: c.auteurId,
          auteurNom: c.auteur,
          auteurRole: c.role,
          contenu: c.contenu,
          formationId: null,
          postId: c.postId,
        };
      }
    }
  }

  // ─── Côté dashboard : examiner ───

  async compteurEnAttente() {
    const enAttente = await this.prisma.signalement.count({
      where: { statut: StatutSignalement.en_attente },
    });
    return { enAttente };
  }

  /**
   * Signalements (les plus récents d'abord) avec, pour chacun : qui a
   * signalé, le nombre total de signalements du même contenu, si ce contenu
   * existe encore et le titre de la formation concernée.
   */
  async lister(statut?: StatutSignalement) {
    const items = await this.prisma.signalement.findMany({
      where: statut ? { statut } : {},
      include: {
        signalePar: {
          select: { id: true, nom: true, email: true, telephone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    if (items.length === 0) return [];

    const idsPar = (type: TypeSignalement) => [
      ...new Set(items.filter((s) => s.type === type).map((s) => s.contenuId)),
    ];
    const [messages, commentairesClasse, commentairesPost, groupes] =
      await Promise.all([
        this.prisma.classeMessage.findMany({
          where: { id: { in: idsPar(TypeSignalement.message_classe) } },
          select: { id: true },
        }),
        this.prisma.commentaireClasse.findMany({
          where: { id: { in: idsPar(TypeSignalement.commentaire_classe) } },
          select: { id: true },
        }),
        this.prisma.commentaire.findMany({
          where: { id: { in: idsPar(TypeSignalement.commentaire_post) } },
          select: { id: true },
        }),
        this.prisma.signalement.groupBy({
          by: ['type', 'contenuId'],
          where: { contenuId: { in: items.map((s) => s.contenuId) } },
          _count: { _all: true },
        }),
      ]);

    const existants = new Set(
      [...messages, ...commentairesClasse, ...commentairesPost].map(
        (c) => c.id,
      ),
    );
    const nbParContenu = new Map(
      groupes.map((g) => [`${g.type}:${g.contenuId}`, g._count._all]),
    );

    const formationIds = [
      ...new Set(items.map((s) => s.formationId).filter((id) => !!id)),
    ] as string[];
    const formations = await this.prisma.formation.findMany({
      where: { id: { in: formationIds } },
      select: { id: true, titre: true },
    });
    const titres = new Map(formations.map((f) => [f.id, f.titre]));

    return items.map((s) => ({
      ...s,
      contenuExiste: existants.has(s.contenuId),
      nbSignalements: nbParContenu.get(`${s.type}:${s.contenuId}`) ?? 1,
      formationTitre: s.formationId
        ? (titres.get(s.formationId) ?? null)
        : null,
    }));
  }

  /**
   * Décision de la modération sur un contenu signalé. Elle s'applique à tous
   * les signalements en attente de ce contenu, et chaque utilisateur qui l'a
   * signalé est prévenu.
   */
  async traiter(
    id: string,
    dto: TraiterSignalementDto,
    moderateur: Utilisateur,
  ) {
    const signalement = await this.prisma.signalement.findUnique({
      where: { id },
    });
    if (!signalement) throw new NotFoundException('Signalement non trouvé');
    if (signalement.statut !== StatutSignalement.en_attente) {
      throw new BadRequestException('Ce signalement a déjà été traité.');
    }

    const supprimer = dto.decision === 'supprimer';
    if (supprimer) {
      await this.supprimerContenu(signalement.type, signalement.contenuId);
    }

    const concernes = await this.prisma.signalement.findMany({
      where: {
        type: signalement.type,
        contenuId: signalement.contenuId,
        statut: StatutSignalement.en_attente,
      },
      select: { id: true, signaleParId: true },
    });
    await this.prisma.signalement.updateMany({
      where: { id: { in: concernes.map((s) => s.id) } },
      data: {
        statut: supprimer ? StatutSignalement.traite : StatutSignalement.rejete,
        traiteParNom: nomDe(moderateur) || 'Modération',
        traiteLe: new Date(),
        note: dto.note?.trim() || null,
      },
    });

    void this.prevenirSignaleurs(
      concernes.map((s) => s.signaleParId),
      supprimer,
    );

    return this.prisma.signalement.findUnique({ where: { id } });
  }

  /** Supprime le contenu s'il existe encore (sans erreur sinon). */
  private async supprimerContenu(type: TypeSignalement, id: string) {
    switch (type) {
      case TypeSignalement.message_classe:
        await this.prisma.classeMessage.deleteMany({ where: { id } });
        return;
      case TypeSignalement.commentaire_classe:
        await this.prisma.commentaireClasse.deleteMany({ where: { id } });
        return;
      case TypeSignalement.commentaire_post: {
        const comm = await this.prisma.commentaire.findUnique({
          where: { id },
          select: { postId: true },
        });
        if (!comm) return;
        await this.prisma.commentaire.deleteMany({ where: { id } });
        this.actualitesGateway.emitCommentaireDeleted(comm.postId, id);
        return;
      }
    }
  }

  /** Informe les auteurs des signalements de la décision. Ne lève jamais. */
  private async prevenirSignaleurs(userIds: string[], supprime: boolean) {
    try {
      await this.notifications.creerPourUtilisateurs(userIds, {
        type: TypeNotification.systeme,
        titre: supprime ? 'Signalement traité' : 'Signalement examiné',
        message: supprime
          ? 'Merci : le contenu que vous avez signalé a été retiré.'
          : 'Merci pour votre signalement. Après examen, ce contenu respecte nos règles et reste en ligne.',
        cible: CIBLE_MODERATION,
        envoyePar: 'Sahel Academy',
      });
    } catch (e) {
      this.logger.error(
        'Notification de décision de modération non envoyée',
        (e as Error)?.stack,
      );
    }
  }
}
