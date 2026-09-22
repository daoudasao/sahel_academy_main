import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { authentifierSocket, optionsSocket } from '../auth/socket-auth';
import { aUnRole } from '../auth/roles.util';

/** Rôles qui gèrent les notifications (alignés sur le dashboard). */
const ROLES_GESTION: Role[] = [Role.ADMIN, Role.STAFF, Role.COMMUNITY_MANAGER];

@WebSocketGateway({ namespace: '/notifications', ...optionsSocket })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  async handleConnection(socket: Socket) {
    try {
      const user = await authentifierSocket(socket);
      if (!user) {
        this.logger.warn(
          `Connexion WebSocket notifications rejetée (non authentifié) : ${socket.id}`,
        );
        socket.disconnect();
        return;
      }

      socket.data.user = user;

      // Rejoint la room spécifique de l'utilisateur
      await socket.join(`user_${user.id}`);

      if (aUnRole(user, ROLES_GESTION)) {
        await socket.join('admin_room');
      }

      this.logger.log(
        `Client connecté aux notifications (${user.id}) : socket ${socket.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur authentification WebSocket notifications : ${String(error)}`,
      );
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(
      `Client déconnecté des notifications : socket ${socket.id}`,
    );
  }

  /**
   * Émet une nouvelle notification en temps réel à ses seuls destinataires.
   *
   * - [destinataires] fourni (notification de formation/classe) : leurs rooms ;
   * - notification personnelle : la room de l'utilisateur ;
   * - notification globale : tout le monde.
   */
  emitNotification(notification: any, destinataires?: string[]) {
    if (!this.server) return;

    if (destinataires) {
      if (destinataires.length > 0) {
        this.server
          .to(destinataires.map((id) => `user_${id}`))
          .emit('new_notification', notification);
      }
    } else {
      const targetUserId =
        notification.userId ||
        (notification.cible === 'individuel' ? notification.cibleId : null);

      if (targetUserId) {
        this.server
          .to(`user_${targetUserId}`)
          .emit('new_notification', notification);
      } else if (notification.cible === 'global') {
        this.server.emit('new_notification', notification);
      }
    }

    if (notification.cible === 'admin') {
      this.server.to('admin_room').emit('new_notification', notification);
    }
  }
}
