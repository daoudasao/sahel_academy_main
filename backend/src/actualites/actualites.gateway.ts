import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { optionsSocket } from '../auth/socket-auth';

// Fil public : pas d'authentification, mais même filtre d'origine que les autres gateways.
@WebSocketGateway({ namespace: '/actualites', ...optionsSocket })
export class ActualitesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ActualitesGateway.name);

  handleConnection(socket: Socket) {
    this.logger.log(`Client connecté au fil d'actualités socket : ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`Client déconnecté du fil d'actualités socket : ${socket.id}`);
  }

  /// Émission d'une nouvelle publication
  emitNewPost(post: any) {
    this.server.emit('new_post', post);
  }

  /// Émission d'une mise à jour de publication
  emitPostUpdated(post: any) {
    this.server.emit('post_updated', post);
  }

  /// Émission de la suppression d'une publication
  emitPostDeleted(postId: string) {
    this.server.emit('post_deleted', { id: postId });
  }

  /// Émission d'un like sur une publication
  emitPostLiked(postId: string, likes: number) {
    this.server.emit('post_liked', { postId, likes });
  }

  /// Émission d'un nouveau commentaire ou d'une réponse
  emitNewCommentaire(postId: string, commentaire: any) {
    this.server.emit('new_commentaire', { postId, commentaire });
  }

  /// Émission de la suppression d'un commentaire
  emitCommentaireDeleted(postId: string, commentaireId: string) {
    this.server.emit('commentaire_deleted', { postId, commentaireId });
  }
}
