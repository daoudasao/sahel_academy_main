import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';
import { FirebaseService } from '../firebase/firebase.service';

/** Notifications adressées à tous les inscrits d'une formation. */
const CIBLES_FORMATION = ['formation', 'classe'];

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly firebaseService: FirebaseService,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const data = { ...createNotificationDto };
    if (data.cible === 'individuel' && data.cibleId && !data.userId) {
      data.userId = data.cibleId;
    }

    // « Élèves en retard » : une notification personnelle par élève concerné,
    // jamais une diffusion générale.
    if (data.cible === 'retard' && !data.userId) {
      return this.creerPourElevesEnRetard(data);
    }

    const notif = await this.prisma.notification.create({ data });
    await this.diffuser(notif);
    return notif;
  }

  /**
   * Élève en retard = au moins une échéance dépassée et pas du tout payée
   * (même règle que le dashboard), éventuellement limitée à une formation.
   */
  private async creerPourElevesEnRetard(data: CreateNotificationDto) {
    const debutDuJour = new Date();
    debutDuJour.setUTCHours(0, 0, 0, 0);

    const enRetard = await this.prisma.echeance.findMany({
      where: {
        montantPaye: { lte: 0 },
        dateEcheance: { lt: debutDuJour },
        ...(data.cibleId ? { formationId: data.cibleId } : {}),
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const { userId } of enRetard) {
      const notif = await this.prisma.notification.create({
        data: { ...data, userId },
      });
      await this.diffuser(notif);
    }

    return { cible: 'retard', envoyees: enRetard.length };
  }

  /** Temps réel (WebSocket) + push (FCM), uniquement vers les destinataires. */
  private async diffuser(notif: Notification) {
    const estFormation =
      !notif.userId && !!notif.cibleId && CIBLES_FORMATION.includes(notif.cible);

    const inscrits = estFormation
      ? await this.prisma.inscription.findMany({
          where: { formationId: notif.cibleId! },
          select: { userId: true, user: { select: { fcmToken: true } } },
        })
      : [];

    try {
      this.notificationsGateway.emitNotification(
        notif,
        estFormation ? inscrits.map((i) => i.userId) : undefined,
      );
    } catch (err) {
      console.error('Erreur émission WebSocket notification:', err);
    }

    const contenu = {
      titre: notif.titre,
      message: notif.message,
      data: {
        id: notif.id,
        type: notif.type,
        cible: notif.cible,
        ...(notif.cibleId ? { cibleId: notif.cibleId } : {}),
      },
    };

    try {
      if (notif.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: notif.userId },
          select: { fcmToken: true },
        });
        if (user?.fcmToken) {
          await this.firebaseService.sendPushNotification(
            { token: user.fcmToken },
            contenu,
          );
        }
      } else if (notif.cible === 'global') {
        await this.firebaseService.sendPushNotification(
          { topic: 'global' },
          contenu,
        );
      } else if (estFormation) {
        const tokens = inscrits
          .map((i) => i.user?.fcmToken)
          .filter((t): t is string => !!t && t.length > 0);

        for (const token of tokens) {
          try {
            await this.firebaseService.sendPushNotification({ token }, contenu);
          } catch (e) {
            console.error("Erreur d'envoi FCM à un destinataire:", e);
          }
        }
      }
    } catch (err) {
      console.error('Erreur envoi FCM Push notification:', err);
    }
  }

  /** Notifications qu'un utilisateur a le droit de voir. */
  private async filtreVisibles(
    userId: string,
  ): Promise<Prisma.NotificationWhereInput> {
    const inscriptions = await this.prisma.inscription.findMany({
      where: { userId },
      select: { formationId: true },
    });
    const formationIds = inscriptions.map((i) => i.formationId);

    return {
      OR: [
        { userId },
        { userId: null, cible: 'global' },
        { userId: null, cible: 'individuel', cibleId: userId },
        ...(formationIds.length > 0
          ? [
              {
                userId: null,
                cible: { in: CIBLES_FORMATION },
                cibleId: { in: formationIds },
              },
            ]
          : []),
      ],
    };
  }

  /**
   * Notifications de l'utilisateur. Pour une notification partagée, `lu`
   * reflète SON état de lecture ; celles qu'il a masquées sont exclues.
   */
  async findAllForUser(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        AND: [
          await this.filtreVisibles(userId),
          { etats: { none: { userId, masquee: true } } },
        ],
      },
      include: { etats: { where: { userId }, select: { lu: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map(({ etats, ...notif }) => ({
      ...notif,
      lu: notif.userId === userId ? notif.lu : (etats[0]?.lu ?? false),
    }));
  }

  async findAllAdmin() {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          include: {
            inscriptions: true,
          },
        },
      },
    });
  }

  private async trouverVisible(id: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { AND: [{ id }, await this.filtreVisibles(userId)] },
    });
    if (!notif) throw new NotFoundException('Notification non trouvée');
    return notif;
  }

  private async majEtat(
    notificationId: string,
    userId: string,
    etat: { lu?: boolean; masquee?: boolean },
  ) {
    await this.prisma.notificationEtat.upsert({
      where: { notificationId_userId: { notificationId, userId } },
      create: { notificationId, userId, ...etat },
      update: etat,
    });
  }

  /** Marque lue pour CET utilisateur uniquement. */
  async markAsRead(id: string, userId: string) {
    const notif = await this.trouverVisible(id, userId);
    if (notif.userId === userId) {
      return this.prisma.notification.update({
        where: { id },
        data: { lu: true },
      });
    }
    await this.majEtat(id, userId, { lu: true });
    return { ...notif, lu: true };
  }

  /**
   * « Supprimer » côté utilisateur : efface une notification personnelle,
   * masque une notification partagée (les autres destinataires la gardent).
   */
  async remove(id: string, userId: string) {
    const notif = await this.trouverVisible(id, userId);
    if (notif.userId === userId) {
      return this.prisma.notification.delete({ where: { id } });
    }
    await this.majEtat(id, userId, { masquee: true });
    return { id, masquee: true };
  }

  /** Suppression définitive, pour tout le monde (dashboard). */
  async removeDefinitivement(id: string) {
    try {
      return await this.prisma.notification.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Notification non trouvée');
    }
  }

  /**
   * Récupère les alertes et messages prioritaires à afficher en modale
   * dès l'ouverture de l'application (retards de paiement, admissions, alertes urgentes).
   */
  async findUrgentesForUser(userId: string) {
    const alertes: Array<{
      id: string;
      type: 'retard_paiement' | 'bourse_admission' | 'notification_urgente';
      titre: string;
      message: string;
      actionRoute: string;
      actionLabel: string;
      badge: string;
      couleur: 'danger' | 'succes' | 'info';
      icone: string;
      priorite: number;
      date?: string;
      imageUrl?: string;
    }> = [];

    // 1. Échéances de paiement en retard
    const debutDuJour = new Date();
    debutDuJour.setUTCHours(0, 0, 0, 0);

    try {
      const echeances = await this.prisma.echeance.findMany({
        where: {
          userId,
          dateEcheance: { lt: debutDuJour },
        },
        include: { formation: true },
        orderBy: { dateEcheance: 'asc' },
      });

      const echeancesEnRetard = echeances.filter(
        (e) => e.montantPaye < e.montantDu,
      );

      for (const ech of echeancesEnRetard) {
        const reste = Math.round(ech.montantDu - ech.montantPaye);
        const dateStr = new Date(ech.dateEcheance).toLocaleDateString('fr-FR');
        const nomFormation = ech.formation?.titre || 'votre formation';
        alertes.push({
          id: `retard_ech_${ech.id}`,
          type: 'retard_paiement',
          titre: 'Échéance de paiement en retard',
          message: `Votre échéance "${ech.libelle}" (${reste.toLocaleString('fr-FR')} FCFA) pour ${nomFormation} est dépassée depuis le ${dateStr}. Régularisez dès maintenant pour maintenir l'accès à vos cours.`,
          actionRoute: '/paiements',
          actionLabel: 'Régler mon échéance',
          badge: 'Paiement urgent',
          couleur: 'danger',
          icone: 'payment',
          priorite: 1,
          date: ech.dateEcheance.toISOString(),
          imageUrl: ech.formation?.imageUrl || undefined,
        });
      }
    } catch (errPaiement) {
      console.error('Erreur récupération retards paiement pour alertes:', errPaiement);
    }

    // 2. Résultats de candidatures aux bourses (Admis ou Non retenu) avec le message officiel
    try {
      const candidatures = await this.prisma.candidature.findMany({
        where: {
          userId,
          statut: { in: ['admis', 'refuse'] },
        },
        include: { bourse: true, user: true },
        orderBy: { updatedAt: 'desc' },
      });

      for (const cand of candidatures) {
        const titreBourse = cand.bourse?.titre || 'Bourse Sahel Academy';
        const nomCompte = cand.user?.nom || cand.nom || 'Étudiant';
        const prenomCompte = nomCompte.trim().split(' ')[0] || nomCompte;
        const emailCompte = cand.user?.email || cand.email || '';
        const dateStr = new Date(cand.updatedAt || cand.dateDepot).toLocaleDateString('fr-FR');
        const imgBourse = cand.bourse?.imageUrl || undefined;

        if (cand.statut === 'admis') {
          let messageAdmission = cand.bourse?.messageAdmission;
          if (messageAdmission && messageAdmission.trim()) {
            messageAdmission = messageAdmission
              .replace(/\{nom\}/gi, nomCompte)
              .replace(/\{prenom\}/gi, prenomCompte)
              .replace(/\{email\}/gi, emailCompte)
              .replace(/\{bourse\}/gi, titreBourse)
              .replace(/\{date\}/gi, dateStr);
          } else {
            messageAdmission = `Félicitations ${nomCompte} ! Votre candidature pour la bourse "${titreBourse}" a été retenue avec succès. Consultez votre document officiel d'admission.`;
          }

          alertes.push({
            id: `bourse_res_${cand.id}`,
            type: 'bourse_admission',
            titre: 'Félicitations ! Bourse accordée 🎓',
            message: messageAdmission,
            actionRoute: `/bourse/${cand.bourseId}/resultat`,
            actionLabel: 'Consulter mon admission',
            badge: 'Résultat de bourse',
            couleur: 'succes',
            icone: 'school',
            priorite: 1,
            date: (cand.updatedAt || cand.dateDepot).toISOString(),
            imageUrl: imgBourse,
          });
        } else if (cand.statut === 'refuse') {
          alertes.push({
            id: `bourse_res_${cand.id}`,
            type: 'bourse_admission',
            titre: 'Résultat de votre candidature',
            message: `Bonjour ${prenomCompte}, votre candidature pour la bourse "${titreBourse}" n'a pas été retenue pour cette session. Nous vous remercions pour votre intérêt et vous encourageons à retenter lors des prochaines promotions.`,
            actionRoute: `/bourse/${cand.bourseId}/resultat`,
            actionLabel: 'Consulter mon dossier',
            badge: 'Résultat de bourse',
            couleur: 'info',
            icone: 'school',
            priorite: 2,
            date: (cand.updatedAt || cand.dateDepot).toISOString(),
            imageUrl: imgBourse,
          });
        }
      }
    } catch (errBourse) {
      console.error('Erreur récupération candidatures pour alertes:', errBourse);
    }

    // 3. Notifications non lues avec leur message complet
    try {
      const notifs = await this.findAllForUser(userId);
      const notifsNonLues = notifs.filter((n) => !n.lu);

      for (const n of notifsNonLues) {
        // Éviter d'ajouter en doublon si une alerte bourse ou retard existe déjà pour le même élément
        if (alertes.some((a) => a.id.includes(n.id) || (n.cibleId && a.id.includes(n.cibleId)))) continue;

        const notifImg =
          n.documentUrl && n.documentUrl.match(/\.(jpg|jpeg|png|webp|gif)/i)
            ? n.documentUrl
            : undefined;

        alertes.push({
          id: `notif_${n.id}`,
          type: 'notification_urgente',
          titre: n.titre,
          message: n.message,
          actionRoute:
            n.cible === 'bourse' && n.cibleId
              ? `/bourse/${n.cibleId}/resultat`
              : '/notifications',
          actionLabel: 'Consulter',
          badge: n.cible === 'bourse' ? 'Résultat Bourse' : 'Notification',
          couleur: n.titre.toLowerCase().includes('urgent') ? 'danger' : 'info',
          icone: 'notifications_active',
          priorite: 3,
          date: n.createdAt.toISOString(),
          imageUrl: notifImg,
        });
      }
    } catch (errNotif) {
      console.error('Erreur récupération notifications pour alertes:', errNotif);
    }

    // Exclusion des alertes déjà consultées / fermées par l'utilisateur (stockées dans la DB)
    try {
      const dejaVues = await this.prisma.alerteVue.findMany({
        where: { userId },
        select: { alerteId: true },
      });
      const vuesSet = new Set(dejaVues.map((v) => v.alerteId));
      return alertes
        .filter((a) => !vuesSet.has(a.id))
        .sort((a, b) => a.priorite - b.priorite);
    } catch (errVues) {
      console.error('Erreur lecture alertes vues DB:', errVues);
      return alertes.sort((a, b) => a.priorite - b.priorite);
    }
  }

  /**
   * Enregistre de manière permanente dans la base de données PostgreSQL
   * que l'utilisateur a vu / fermé ces alertes (garantit qu'il ne les reverra plus,
   * même en changeant d'appareil ou après vidage de cache).
   */
  async marquerAlertesVues(userId: string, alerteIds: string[]) {
    if (!Array.isArray(alerteIds) || alerteIds.length === 0) {
      return { success: true, count: 0 };
    }

    const uniqueIds = Array.from(
      new Set(
        alerteIds.filter(
          (id): id is string => typeof id === 'string' && id.trim().length > 0,
        ),
      ),
    );
    if (uniqueIds.length === 0) return { success: true, count: 0 };

    await this.prisma.alerteVue.createMany({
      data: uniqueIds.map((alerteId) => ({ userId, alerteId })),
      skipDuplicates: true,
    });

    // Si une alerte correspond à une notification, la marquer également comme lue dans la DB
    for (const id of uniqueIds) {
      if (id.startsWith('notif_')) {
        const notifId = id.replace('notif_', '');
        try {
          await this.markAsRead(notifId, userId);
        } catch (_) {}
      }
    }

    return { success: true, count: uniqueIds.length };
  }
}
