import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActualitesGateway } from '../actualites/actualites.gateway';
import { HORS_CORBEILLE } from './corbeille.util';

export const TYPES_CORBEILLE = [
  'bourse',
  'formation',
  'centre',
  'departement',
  'actualite',
] as const;
export type TypeCorbeille = (typeof TYPES_CORBEILLE)[number];

/** Élément de la corbeille, tel qu'affiché dans le dashboard. */
export interface ElementCorbeille {
  type: TypeCorbeille;
  id: string;
  titre: string;
  detail: string | null;
  deletedAt: Date;
  deletedByNom: string | null;
}

const SUPPRIME = { deletedAt: { not: null } } as const;
const META = { id: true, deletedAt: true, deletedByNom: true } as const;

const extrait = (texte: string, max = 80) =>
  texte.length > max ? `${texte.slice(0, max).trimEnd()}…` : texte;

@Injectable()
export class CorbeilleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actualitesGateway: ActualitesGateway,
  ) {}

  verifierType(type: string): TypeCorbeille {
    if (!(TYPES_CORBEILLE as readonly string[]).includes(type)) {
      throw new BadRequestException('Type inconnu.');
    }
    return type as TypeCorbeille;
  }

  /** Tous les éléments supprimés, du plus récent au plus ancien. */
  async lister(): Promise<ElementCorbeille[]> {
    const ordre = { deletedAt: 'desc' } as const;
    const [bourses, formations, centres, departements, posts] =
      await Promise.all([
        this.prisma.bourse.findMany({
          where: SUPPRIME,
          select: {
            ...META,
            titre: true,
            _count: { select: { candidatures: true } },
          },
          orderBy: ordre,
        }),
        this.prisma.formation.findMany({
          where: SUPPRIME,
          select: {
            ...META,
            titre: true,
            _count: { select: { inscriptions: true } },
          },
          orderBy: ordre,
        }),
        this.prisma.centre.findMany({
          where: SUPPRIME,
          select: { ...META, nom: true, ville: true },
          orderBy: ordre,
        }),
        this.prisma.departement.findMany({
          where: SUPPRIME,
          select: { ...META, nom: true },
          orderBy: ordre,
        }),
        this.prisma.post.findMany({
          where: SUPPRIME,
          select: { ...META, contenu: true, auteurNom: true },
          orderBy: ordre,
        }),
      ]);

    const pluriel = (n: number, mot: string) =>
      `${n} ${mot}${n > 1 ? 's' : ''}`;

    const elements: ElementCorbeille[] = [
      ...bourses.map((b) => ({
        type: 'bourse' as const,
        id: b.id,
        titre: b.titre,
        detail: pluriel(b._count.candidatures, 'candidature'),
        deletedAt: b.deletedAt!,
        deletedByNom: b.deletedByNom,
      })),
      ...formations.map((f) => ({
        type: 'formation' as const,
        id: f.id,
        titre: f.titre,
        detail: pluriel(f._count.inscriptions, 'inscrit'),
        deletedAt: f.deletedAt!,
        deletedByNom: f.deletedByNom,
      })),
      ...centres.map((c) => ({
        type: 'centre' as const,
        id: c.id,
        titre: c.nom,
        detail: c.ville,
        deletedAt: c.deletedAt!,
        deletedByNom: c.deletedByNom,
      })),
      ...departements.map((d) => ({
        type: 'departement' as const,
        id: d.id,
        titre: d.nom,
        detail: null,
        deletedAt: d.deletedAt!,
        deletedByNom: d.deletedByNom,
      })),
      ...posts.map((p) => ({
        type: 'actualite' as const,
        id: p.id,
        titre: extrait(p.contenu.replace(/\s+/g, ' ').trim()) || 'Publication',
        detail: p.auteurNom,
        deletedAt: p.deletedAt!,
        deletedByNom: p.deletedByNom,
      })),
    ];

    return elements.sort(
      (a, b) => b.deletedAt.getTime() - a.deletedAt.getTime(),
    );
  }

  /** Remet un élément en place, tel qu'il était avant la suppression. */
  async restaurer(type: TypeCorbeille, id: string) {
    const ou = { id, ...SUPPRIME };
    switch (type) {
      case 'bourse':
        return this.sortir(() =>
          this.prisma.bourse.update({ where: ou, data: HORS_CORBEILLE }),
        );
      case 'centre':
        return this.sortir(() =>
          this.prisma.centre.update({ where: ou, data: HORS_CORBEILLE }),
        );
      case 'departement':
        return this.sortir(() =>
          this.prisma.departement.update({ where: ou, data: HORS_CORBEILLE }),
        );
      case 'formation': {
        const formation = await this.prisma.formation.findFirst({
          where: ou,
          select: { departement: { select: { nom: true, deletedAt: true } } },
        });
        if (!formation)
          throw new NotFoundException('Élément introuvable dans la corbeille.');
        if (formation.departement.deletedAt) {
          throw new ConflictException(
            `Restaurez d'abord le département « ${formation.departement.nom} », lui aussi dans la corbeille.`,
          );
        }
        return this.prisma.formation.update({
          where: ou,
          data: HORS_CORBEILLE,
        });
      }
      case 'actualite': {
        const post = await this.sortir(() =>
          this.prisma.post.update({
            where: ou,
            data: HORS_CORBEILLE,
            include: {
              medias: true,
              actions: true,
              commentaires: {
                where: { parentId: null },
                include: { reponses: true },
                orderBy: { createdAt: 'asc' },
              },
              _count: { select: { commentaires: true } },
            },
          }),
        );
        this.actualitesGateway.emitNewPost(post);
        return post;
      }
    }
  }

  /**
   * Efface définitivement un élément déjà dans la corbeille (réservé au
   * super admin). Les données liées partent avec lui, comme avant la
   * corbeille (candidatures d'une bourse, inscriptions et paiements d'une
   * formation…).
   */
  async supprimerDefinitivement(type: TypeCorbeille, id: string) {
    const ou = { id, ...SUPPRIME };
    switch (type) {
      case 'bourse':
        return this.sortir(() => this.prisma.bourse.delete({ where: ou }));
      case 'formation':
        return this.sortir(() => this.prisma.formation.delete({ where: ou }));
      case 'centre':
        return this.sortir(() => this.prisma.centre.delete({ where: ou }));
      case 'actualite':
        return this.sortir(() => this.prisma.post.delete({ where: ou }));
      case 'departement': {
        const formations = await this.prisma.formation.count({
          where: { departementId: id },
        });
        if (formations > 0) {
          throw new ConflictException(
            `Ce département contient encore ${formations} formation(s) (actives ou dans la corbeille). Supprimez-les définitivement d'abord.`,
          );
        }
        return this.sortir(() => this.prisma.departement.delete({ where: ou }));
      }
    }
  }

  /** Traduit « enregistrement introuvable » en 404 lisible. */
  private async sortir<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Élément introuvable dans la corbeille.');
      }
      throw e;
    }
  }
}
