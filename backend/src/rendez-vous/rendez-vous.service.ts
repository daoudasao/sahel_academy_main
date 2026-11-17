import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, StatutRendezVous } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NON_SUPPRIME, versCorbeille } from '../corbeille/corbeille.util';
import { nomDe } from '../auth/roles.util';
import { dateDuCreneau, lireIdCreneau } from '../centres/creneaux.util';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { UpdateRendezVousDto } from './dto/update-rendez-vous.dto';

/** Rôles qui voient et traitent les rendez-vous dans le dashboard. */
export const ROLES_RENDEZ_VOUS: Role[] = [
  Role.CHEF_CENTRE,
  Role.STAFF,
  Role.SUPPORT,
  Role.RESPONSABLE_PEDAGOGIQUE,
];

/** Un rendez-vous encore « vivant » (ni annulé, ni passé). */
const STATUTS_ACTIFS: StatutRendezVous[] = [
  StatutRendezVous.en_attente,
  StatutRendezVous.confirme,
];

/** Centre tel que renvoyé avec un rendez-vous (localisation comprise). */
const CENTRE_SELECT = {
  id: true,
  nom: true,
  ville: true,
  adresse: true,
  telephone: true,
  latitude: true,
  longitude: true,
  lienMaps: true,
} as const;

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Bamako',
  }).format(d);

type Auteur = Parameters<typeof versCorbeille>[0];

@Injectable()
export class RendezVousService {
  private readonly logger = new Logger(RendezVousService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Côté utilisateur (app) ───

  async prendre(userId: string, dto: CreateRendezVousDto) {
    // Créneau hebdomadaire : l'app envoie « <idCreneau>@<AAAA-MM-JJ> ».
    const { id: creneauId, jour } = lireIdCreneau(dto.creneauId);
    const creneau = await this.prisma.creneau.findUnique({
      where: { id: creneauId },
      include: { centre: { select: { deletedAt: true } } },
    });
    if (!creneau || creneau.centre.deletedAt) {
      throw new NotFoundException('Ce créneau n’est plus disponible.');
    }
    const dateHeure = dateDuCreneau(creneau, jour);
    if (!dateHeure) {
      throw new BadRequestException('Ce créneau n’est plus disponible.');
    }
    if (dateHeure.getTime() <= Date.now()) {
      throw new BadRequestException('Ce créneau est déjà passé.');
    }
    const existant = await this.prisma.rendezVous.findFirst({
      where: {
        userId,
        creneauId: creneau.id,
        dateHeure,
        statut: { in: STATUTS_ACTIFS },
        ...NON_SUPPRIME,
      },
      select: { id: true },
    });
    if (existant) {
      throw new ConflictException('Tu as déjà un rendez-vous sur ce créneau.');
    }
    return this.prisma.rendezVous.create({
      data: {
        userId,
        centreId: creneau.centreId,
        creneauId: creneau.id,
        dateHeure,
        motif: dto.motif?.trim() || null,
      },
      include: { centre: { select: CENTRE_SELECT } },
    });
  }

  mesRendezVous(userId: string) {
    return this.prisma.rendezVous.findMany({
      where: { userId, ...NON_SUPPRIME },
      // La note interne de l'équipe n'est jamais envoyée à l'utilisateur.
      omit: { noteAdmin: true, deletedById: true, deletedByNom: true },
      include: { centre: { select: CENTRE_SELECT } },
      orderBy: { dateHeure: 'desc' },
    });
  }

  async annulerMien(id: string, userId: string) {
    const rdv = await this.prisma.rendezVous.findFirst({
      where: { id, userId, ...NON_SUPPRIME },
      select: { statut: true },
    });
    if (!rdv) throw new NotFoundException('Rendez-vous introuvable.');
    if (!STATUTS_ACTIFS.includes(rdv.statut)) {
      throw new BadRequestException('Ce rendez-vous ne peut plus être annulé.');
    }
    return this.prisma.rendezVous.update({
      where: { id },
      data: { statut: StatutRendezVous.annule, traiteLe: new Date() },
      omit: { noteAdmin: true, deletedById: true, deletedByNom: true },
      include: { centre: { select: CENTRE_SELECT } },
    });
  }

  // ─── Côté équipe (dashboard) ───

  lister(statut?: StatutRendezVous) {
    return this.prisma.rendezVous.findMany({
      where: { ...NON_SUPPRIME, ...(statut ? { statut } : {}) },
      include: {
        user: {
          select: { id: true, nom: true, email: true, telephone: true },
        },
        centre: { select: { id: true, nom: true, ville: true } },
      },
      orderBy: { dateHeure: 'desc' },
    });
  }

  async modifier(id: string, dto: UpdateRendezVousDto, user: Auteur) {
    const avant = await this.prisma.rendezVous.findFirst({
      where: { id, ...NON_SUPPRIME },
      include: { centre: { select: { nom: true } } },
    });
    if (!avant) throw new NotFoundException('Rendez-vous introuvable.');

    const statutChange = !!dto.statut && dto.statut !== avant.statut;
    const data: Prisma.RendezVousUpdateInput = {};
    if (dto.noteAdmin !== undefined)
      data.noteAdmin = dto.noteAdmin.trim() || null;
    if (statutChange) {
      data.statut = dto.statut;
      data.traiteParNom = nomDe(user) || null;
      data.traiteLe = new Date();
    }

    const rdv = await this.prisma.rendezVous.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, nom: true, email: true, telephone: true },
        },
        centre: { select: { id: true, nom: true, ville: true } },
      },
    });

    if (statutChange)
      await this.prevenir(
        rdv.userId,
        rdv.statut,
        avant.centre.nom,
        rdv.dateHeure,
      );
    return rdv;
  }

  async remove(id: string, user: Auteur) {
    try {
      return await this.prisma.rendezVous.update({
        where: { id, ...NON_SUPPRIME },
        data: versCorbeille(user),
      });
    } catch {
      throw new NotFoundException('Rendez-vous introuvable.');
    }
  }

  /** Notifie l'utilisateur (push + liste) quand l'équipe confirme ou annule. */
  private async prevenir(
    userId: string,
    statut: StatutRendezVous,
    centre: string,
    dateHeure: Date,
  ) {
    const quand = `${centre}, ${formatDate(dateHeure)}`;
    const textes: Partial<
      Record<StatutRendezVous, { titre: string; message: string }>
    > = {
      confirme: {
        titre: 'Rendez-vous confirmé ✅',
        message: `Ton rendez-vous est confirmé : ${quand}.`,
      },
      annule: {
        titre: 'Rendez-vous annulé',
        message: `Ton rendez-vous (${quand}) a été annulé. Tu peux choisir un autre créneau dans l’app.`,
      },
    };
    const texte = textes[statut];
    if (!texte) return;
    try {
      await this.notifications.creerPourUtilisateurs([userId], {
        type: 'systeme',
        ...texte,
        cible: 'individuel',
        cibleId: userId,
        route: '/rendez-vous',
      });
    } catch (e) {
      // La notification est un plus : son échec n'annule pas le changement.
      this.logger.warn(
        `Notification de rendez-vous non envoyée : ${String(e)}`,
      );
    }
  }
}
