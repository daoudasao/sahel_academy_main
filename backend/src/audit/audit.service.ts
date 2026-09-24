import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { nomDe } from '../auth/roles.util';
import {
  ACTION_PAR_METHODE,
  ActionAudit,
  idDe,
  ipDe,
  libelleDe,
  messageErreur,
  nettoyer,
  routeDe,
  userAgentDe,
} from './audit.util';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

export interface EntreeAudit {
  userId?: string | null;
  userNom?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: ActionAudit;
  ressource: string;
  ressourceId?: string | null;
  libelle?: string | null;
  methode: string;
  route: string;
  statut: number;
  succes: boolean;
  details?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

/** Requête Express vue par le journal (utilisateur posé par AuthGuard). */
export interface RequeteAuditee {
  method: string;
  route?: { path?: unknown };
  path?: unknown;
  params?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, unknown>;
  ips?: unknown;
  ip?: unknown;
  user?: {
    id?: string;
    nom?: string | null;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Écrit une entrée. N'échoue jamais : un souci de journalisation ne doit pas
   * faire échouer l'action de l'utilisateur.
   */
  async enregistrer(entree: EntreeAudit): Promise<void> {
    const { details, ...reste } = entree;
    try {
      await this.prisma.auditLog.create({
        data: {
          ...reste,
          ...(details != null ? { details: details as Prisma.InputJsonValue } : {}),
        },
      });
    } catch (e) {
      this.logger.error(`Écriture dans le journal d'audit impossible : ${e}`);
    }
  }

  /**
   * Trace une écriture HTTP (POST/PUT/PATCH/DELETE) à partir de la requête.
   * Les lectures sont ignorées. Asynchrone et sans attente : la réponse de
   * l'utilisateur n'est pas retardée.
   */
  journaliserRequete(
    req: RequeteAuditee,
    resultat: { statut: number; succes: boolean; reponse?: unknown; erreur?: unknown },
  ): void {
    const methode = (req.method ?? '').toUpperCase();
    const action = ACTION_PAR_METHODE[methode];
    if (!action) return;

    const route = routeDe(req);
    const params =
      req.params && Object.keys(req.params).length > 0 ? req.params : undefined;
    const corps =
      req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0
        ? req.body
        : undefined;
    const details = {
      ...(params ? { params } : {}),
      ...(corps ? { corps } : {}),
      ...(resultat.erreur !== undefined
        ? { erreur: messageErreur(resultat.erreur) }
        : {}),
    };

    const user = req.user ?? null;
    const ressource = route.split('/')[0] || 'inconnu';
    const ressourceId = idDe(req.params, resultat.reponse);
    // Les valeurs envoyées ne nomment l'élément que si l'action a abouti (ou
    // pour une création) : sur une modification refusée, ce serait la valeur
    // tentée (« Pirate ») et non l'élément visé.
    const libelle = libelleDe(
      resultat.reponse,
      resultat.succes || action === 'CREATION' ? req.body : undefined,
    );
    const entree: EntreeAudit = {
      userId: user?.id ?? null,
      userNom: nomDe(user) || null,
      userEmail: user?.email ?? null,
      userRole: user?.role ?? null,
      action,
      ressource,
      ressourceId,
      methode,
      route,
      statut: resultat.statut,
      succes: resultat.succes,
      details: Object.keys(details).length > 0 ? nettoyer(details) : null,
      ip: ipDe(req),
      userAgent: userAgentDe(req),
    };
    void this.libelleCompte(ressource, ressourceId, libelle).then((nom) =>
      this.enregistrer({ ...entree, libelle: nom }),
    );
  }

  /**
   * Pour une action sur un compte utilisateur (rôle, mot de passe,
   * suppression…), retrouve le nom du compte visé si l'action ne l'a pas
   * fourni. Ne lève jamais.
   */
  private async libelleCompte(
    ressource: string,
    ressourceId: string | null,
    libelle: string | null,
  ): Promise<string | null> {
    if (libelle || ressource !== 'users' || !ressourceId) return libelle;
    try {
      const cible = await this.prisma.user.findUnique({
        where: { id: ressourceId },
        select: { nom: true, email: true },
      });
      return cible ? cible.nom || cible.email : null;
    } catch {
      return null;
    }
  }

  async lister(q: ListAuditLogsDto) {
    const page = q.page ?? 1;
    const limite = q.limite ?? 50;
    const where = this.filtre(q);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limite,
        take: limite,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      limite,
      pages: Math.max(1, Math.ceil(total / limite)),
    };
  }

  /** Valeurs proposées dans les filtres (ressources et auteurs connus). */
  async filtres() {
    const [ressources, auteurs] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['ressource'],
        orderBy: { ressource: 'asc' },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { userId: { not: null } },
        _max: { userNom: true, userEmail: true, userRole: true },
      }),
    ]);
    return {
      ressources: ressources.map((r) => r.ressource),
      utilisateurs: auteurs
        .map((a) => ({
          id: a.userId as string,
          nom: a._max.userNom,
          email: a._max.userEmail,
          role: a._max.userRole,
        }))
        .sort((a, b) =>
          (a.nom ?? a.email ?? '').localeCompare(b.nom ?? b.email ?? '', 'fr'),
        ),
    };
  }

  /** Chiffres des dernières 24 h, pour l'en-tête de la page. */
  async resume() {
    const depuis = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [actions, suppressions, echecs, connexions] =
      await this.prisma.$transaction([
        this.prisma.auditLog.count({
          where: { createdAt: { gte: depuis }, action: { not: 'CONNEXION' } },
        }),
        this.prisma.auditLog.count({
          where: { createdAt: { gte: depuis }, action: 'SUPPRESSION' },
        }),
        this.prisma.auditLog.count({
          where: { createdAt: { gte: depuis }, succes: false },
        }),
        this.prisma.auditLog.count({
          where: { createdAt: { gte: depuis }, action: 'CONNEXION' },
        }),
      ]);
    return { actions, suppressions, echecs, connexions };
  }

  private filtre(q: ListAuditLogsDto): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};
    if (q.userId) where.userId = q.userId;
    if (q.action) where.action = q.action;
    if (q.ressource) where.ressource = q.ressource;
    if (q.succes) where.succes = q.succes === 'true';
    if (q.du || q.au) {
      where.createdAt = {
        ...(q.du ? { gte: new Date(q.du) } : {}),
        ...(q.au ? { lte: new Date(q.au) } : {}),
      };
    }
    const recherche = q.recherche?.trim();
    if (recherche) {
      const contient = { contains: recherche, mode: 'insensitive' as const };
      where.OR = [
        { userNom: contient },
        { userEmail: contient },
        { libelle: contient },
        { route: contient },
        { ressourceId: recherche },
      ];
    }
    return where;
  }
}
