import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpediteurSupport, TypeNotification, Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { SupportGateway } from './support.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { aUnRole } from '../auth/roles.util';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supportGateway: SupportGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Côté client ───

  /// Messages du fil de l'utilisateur ; marque au passage les messages du
  /// support comme lus.
  async getMyMessages(userId: string) {
    await this.prisma.supportMessage.updateMany({
      where: { userId, expediteur: ExpediteurSupport.support, lu: false },
      data: { lu: true },
    });
    return this.prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendAsClient(userId: string, dto: CreateSupportMessageDto) {
    const msg = await this.prisma.supportMessage.create({
      data: {
        userId,
        expediteur: ExpediteurSupport.client,
        contenu: dto.contenu,
        type: dto.type || (dto.documentUrl ? 'document' : 'texte'),
        audioUrl: dto.audioUrl,
        documentUrl: dto.documentUrl,
        documentNom: dto.documentNom,
        dureeSeconds: dto.dureeSeconds,
      },
    });
    this.supportGateway.emitNewMessage(userId, msg);
    return msg;
  }

  /// Supprime un message du chat support (des deux côtés)
  async deleteMessage(messageId: string, currentUser: User) {
    const msg = await this.prisma.supportMessage.findUnique({
      where: { id: messageId },
    });
    if (!msg) {
      throw new NotFoundException('Message introuvable.');
    }

    // aUnRole : un SUPER_ADMIN passe toujours.
    const isStaffOrAdmin = aUnRole(currentUser, [
      Role.CHEF_CENTRE,
      Role.STAFF,
      Role.SUPPORT,
    ]);

    if (!isStaffOrAdmin) {
      // Un utilisateur ne peut supprimer que ses propres messages
      if (msg.userId !== currentUser.id) {
        throw new ForbiddenException('Action non autorisée.');
      }
    }

    await this.prisma.supportMessage.delete({
      where: { id: messageId },
    });

    this.supportGateway.emitMessageDeleted(msg.userId, messageId);
    return { success: true, id: messageId };
  }

  // ─── Côté support (Admin/Staff) ───

  /// Liste des conversations (un fil par utilisateur) avec le dernier message et le nombre de messages non lus.
  async getConversations() {
    const users = await this.prisma.user.findMany({
      where: { supportMessages: { some: {} } },
      select: {
        id: true,
        nom: true,
        email: true,
        telephone: true,
        image: true,
        supportMessages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: {
          select: {
            supportMessages: {
              where: { expediteur: ExpediteurSupport.client, lu: false },
            },
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      nom: u.nom,
      email: u.email,
      telephone: u.telephone,
      image: u.image,
      lastMessage: u.supportMessages[0] || null,
      unreadCount: u._count.supportMessages,
    }));
  }

  async getConversation(userId: string) {
    await this.prisma.supportMessage.updateMany({
      where: { userId, expediteur: ExpediteurSupport.client, lu: false },
      data: { lu: true },
    });
    return this.prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendAsSupport(userId: string, dto: CreateSupportMessageDto) {
    const msg = await this.prisma.supportMessage.create({
      data: {
        userId,
        expediteur: ExpediteurSupport.support,
        contenu: dto.contenu,
        type: dto.type || (dto.documentUrl ? 'document' : 'texte'),
        audioUrl: dto.audioUrl,
        documentUrl: dto.documentUrl,
        documentNom: dto.documentNom,
        dureeSeconds: dto.dureeSeconds,
      },
    });
    this.supportGateway.emitNewMessage(userId, msg);

    // Envoi de la notification push FCM
    try {
      await this.notificationsService.create({
        userId,
        type: TypeNotification.systeme,
        titre: 'Nouveau message du Support',
        message:
          dto.type === 'vocal' || dto.type === 'audio'
            ? 'Vous avez reçu un message vocal du support.'
            : dto.contenu || 'Nouveau message reçu.',
        cible: 'support',
        envoyePar: 'Support',
        documentUrl: dto.documentUrl,
        documentNom: dto.documentNom,
      });
    } catch (err) {
      console.error('Erreur notification push support:', err);
    }

    return msg;
  }
}
