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

/** Rôles qui répondent aux clients (alignés sur la page Support du dashboard). */
const ROLES_AGENTS: Role[] = [
  Role.ADMIN,
  Role.STAFF,
  Role.SUPPORT,
  Role.COMMUNITY_MANAGER,
];

@WebSocketGateway({ namespace: '/support', ...optionsSocket })
export class SupportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);

  async handleConnection(socket: Socket) {
    try {
      const user = await authentifierSocket(socket);
      if (!user) {
        this.logger.warn(`Connexion WebSocket rejetée (non authentifié) : ${socket.id}`);
        socket.disconnect();
        return;
      }

      socket.data.user = user;

      // Rejoint la room spécifique de l'utilisateur
      await socket.join(`user_${user.id}`);

      // Les agents du support suivent toutes les conversations
      if (aUnRole(user, ROLES_AGENTS)) {
        await socket.join('admin_room');
      }

      this.logger.log(
        `Socket connecté : ${socket.id} pour l'utilisateur ${user.id} (${user.role})`,
      );
    } catch (error) {
      this.logger.error(`Erreur authentification WebSocket : ${String(error)}`);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`Socket déconnecté : ${socket.id}`);
  }

  /**
   * Diffusion d'un nouveau message vers la room de l'utilisateur et la room admin.
   */
  emitNewMessage(userId: string, message: any) {
    // Émission vers le fil du client
    this.server.to(`user_${userId}`).emit('new_message', message);
    // Émission vers le tableau de bord support admin
    this.server.to('admin_room').emit('new_message', message);
  }

  /**
   * Diffusion de la suppression d'un message vers la room client et admin.
   */
  emitMessageDeleted(userId: string, messageId: string) {
    this.server.to(`user_${userId}`).emit('delete_message', { id: messageId });
    this.server.to('admin_room').emit('delete_message', { id: messageId });
  }
}
