import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

/**
 * Attribue le rôle SUPER_ADMIN aux comptes listés dans SUPER_ADMIN_EMAILS
 * (e-mails séparés par des virgules), à chaque démarrage de l'API.
 *
 * C'est la seule façon de créer le premier SUPER_ADMIN : un ADMIN ne peut pas
 * s'attribuer ce rôle. Le compte doit déjà exister (inscription faite).
 * Retirer un e-mail de la variable ne rétrograde pas le compte : un
 * SUPER_ADMIN le fait depuis la page Rôles.
 */
@Injectable()
export class SuperAdminBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminBootstrap.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async onApplicationBootstrap() {
    // better-auth enregistre les e-mails en minuscules.
    const emails = (process.env.SUPER_ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (emails.length === 0) return;

    try {
      const aPromouvoir = await this.prisma.user.findMany({
        where: { email: { in: emails }, role: { not: Role.SUPER_ADMIN } },
        select: { id: true, nom: true, email: true, role: true },
      });
      for (const u of aPromouvoir) {
        await this.prisma.user.update({
          where: { id: u.id },
          data: { role: Role.SUPER_ADMIN },
        });
        await this.audit.enregistrer({
          userNom: 'Système',
          action: 'ATTRIBUTION_ROLE',
          ressource: 'users',
          ressourceId: u.id,
          libelle: u.nom || u.email,
          methode: 'SYSTEME',
          route: 'SUPER_ADMIN_EMAILS',
          statut: 200,
          succes: true,
          details: {
            ancienRole: u.role,
            nouveauRole: Role.SUPER_ADMIN,
            source: 'variable SUPER_ADMIN_EMAILS',
          },
        });
        this.logger.log(`${u.email} promu SUPER_ADMIN (SUPER_ADMIN_EMAILS)`);
      }
      const trouves = new Set(
        (
          await this.prisma.user.findMany({
            where: { email: { in: emails } },
            select: { email: true },
          })
        ).map((u) => u.email),
      );
      for (const email of emails.filter((e) => !trouves.has(e))) {
        this.logger.warn(
          `SUPER_ADMIN_EMAILS : aucun compte pour ${email} (inscris-toi d'abord, puis redémarre l'API).`,
        );
      }
    } catch (e) {
      this.logger.error(`Attribution SUPER_ADMIN impossible : ${e}`);
    }
  }
}
