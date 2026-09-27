import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PingInstallDto } from './dto/ping-install.dto';

@Injectable()
export class AppInstallsService {
  private readonly logger = new Logger(AppInstallsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre ou met à jour l'empreinte d'un appareil pour un utilisateur.
   * Utilise un upsert pour dédoublonner sur (userId + deviceFingerprint).
   */
  async ping(userId: string, dto: PingInstallDto) {
    const data = {
      plateforme: dto.plateforme.toLowerCase(),
      typeInstallation: dto.typeInstallation.toLowerCase(),
      appVersion: dto.appVersion || null,
      deviceModel: dto.deviceModel || null,
      dernierAcces: new Date(),
    };

    const install = await this.prisma.appInstall.upsert({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint: dto.deviceFingerprint,
        },
      },
      update: data,
      create: {
        userId,
        deviceFingerprint: dto.deviceFingerprint,
        ...data,
      },
    });

    this.logger.log(
      `Ping install — user=${userId} plateforme=${data.plateforme} type=${data.typeInstallation}`,
    );

    return { id: install.id, dernierAcces: install.dernierAcces };
  }

  /**
   * Statistiques agrégées pour le dashboard admin.
   */
  async stats() {
    const [
      total,
      parPlateforme,
      parType,
      dernieres24h,
      derniers7j,
      derniers30j,
    ] = await Promise.all([
      // Total d'installations uniques (appareils)
      this.prisma.appInstall.count(),

      // Répartition par plateforme
      this.prisma.appInstall.groupBy({
        by: ['plateforme'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Répartition par type d'installation
      this.prisma.appInstall.groupBy({
        by: ['typeInstallation'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Actifs dernières 24h
      this.prisma.appInstall.count({
        where: {
          dernierAcces: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),

      // Actifs 7 derniers jours
      this.prisma.appInstall.count({
        where: {
          dernierAcces: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),

      // Actifs 30 derniers jours
      this.prisma.appInstall.count({
        where: {
          dernierAcces: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Nombre d'utilisateurs uniques ayant au moins un appareil
    const utilisateursUniques = await this.prisma.appInstall
      .groupBy({ by: ['userId'] })
      .then((r) => r.length);

    return {
      total,
      utilisateursUniques,
      actifs24h: dernieres24h,
      actifs7j: derniers7j,
      actifs30j: derniers30j,
      parPlateforme: parPlateforme.map((p) => ({
        plateforme: p.plateforme,
        nombre: p._count.id,
      })),
      parType: parType.map((t) => ({
        type: t.typeInstallation,
        nombre: t._count.id,
      })),
    };
  }

  /**
   * Liste détaillée de toutes les installations (pour le tableau admin).
   */
  async list(options?: {
    plateforme?: string;
    typeInstallation?: string;
    page?: number;
    limite?: number;
  }) {
    const page = options?.page ?? 1;
    const limite = options?.limite ?? 50;
    const skip = (page - 1) * limite;

    const where: Record<string, unknown> = {};
    if (options?.plateforme) where.plateforme = options.plateforme.toLowerCase();
    if (options?.typeInstallation)
      where.typeInstallation = options.typeInstallation.toLowerCase();

    const [items, total] = await Promise.all([
      this.prisma.appInstall.findMany({
        where,
        include: {
          user: { select: { id: true, nom: true, email: true, image: true } },
        },
        orderBy: { dernierAcces: 'desc' },
        skip,
        take: limite,
      }),
      this.prisma.appInstall.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limite,
      pages: Math.ceil(total / limite),
    };
  }
}
