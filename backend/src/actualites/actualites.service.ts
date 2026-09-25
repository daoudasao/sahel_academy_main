import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';
import { TypeMedia, TypeNotification } from '@prisma/client';
import { ActualitesGateway } from './actualites.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { auteurDeCommentaire } from '../auth/roles.util';

@Injectable()
export class ActualitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actualitesGateway: ActualitesGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createPostDto: CreatePostDto) {
    const { medias, actions, ...postData } = createPostDto;

    const post = await this.prisma.post.create({
      data: {
        ...postData,
        medias: medias
          ? {
              create: medias.map((m) => ({
                ...m,
                type: m.type as TypeMedia,
              })),
            }
          : undefined,
        actions: actions
          ? {
              create: actions,
            }
          : undefined,
      },
      include: {
        medias: true,
        actions: true,
        commentaires: {
          where: { parentId: null },
          include: { reponses: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    this.actualitesGateway.emitNewPost(post);

    // Envoi de la notification push FCM globale
    try {
      await this.notificationsService.create({
        type: TypeNotification.actualite,
        titre: 'Nouvelle actualité',
        message:
          postData.contenu && postData.contenu.length > 100
            ? `${postData.contenu.substring(0, 97)}...`
            : postData.contenu || 'Une nouvelle publication est disponible sur Sahel Academy.',
        cible: 'global',
        envoyePar: postData.auteurNom || 'Sahel Academy',
        route: `/post/${post.id}`,
      });
    } catch (err) {
      console.error('Erreur notification push actualité:', err);
    }

    return post;
  }

  async findAll() {
    return this.prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        medias: true,
        actions: true,
        commentaires: {
          where: { parentId: null },
          include: { reponses: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { commentaires: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        medias: true,
        actions: true,
        commentaires: {
          where: { parentId: null },
          include: { reponses: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!post) throw new NotFoundException('Post non trouvé');
    return post;
  }

  async update(id: string, updatePostDto: UpdatePostDto) {
    const { medias: _medias, actions: _actions, ...postData } = updatePostDto;
    try {
      const updated = await this.prisma.post.update({
        where: { id },
        data: postData,
        include: {
          medias: true,
          actions: true,
          commentaires: {
            where: { parentId: null },
            include: { reponses: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      this.actualitesGateway.emitPostUpdated(updated);
      return updated;
    } catch {
      throw new NotFoundException('Post non trouvé');
    }
  }

  async remove(id: string) {
    try {
      const deleted = await this.prisma.post.delete({
        where: { id },
      });
      this.actualitesGateway.emitPostDeleted(id);
      return deleted;
    } catch {
      throw new NotFoundException('Post non trouvé');
    }
  }

  async like(id: string) {
    try {
      const updated = await this.prisma.post.update({
        where: { id },
        data: { likes: { increment: 1 } },
      });
      this.actualitesGateway.emitPostLiked(id, updated.likes);
      return updated;
    } catch {
      throw new NotFoundException('Post non trouvé');
    }
  }

  async unlike(id: string) {
    try {
      const post = await this.prisma.post.findUnique({ where: { id } });
      if (!post) throw new NotFoundException('Post non trouvé');
      const newLikes = Math.max(0, post.likes - 1);
      const updated = await this.prisma.post.update({
        where: { id },
        data: { likes: newLikes },
      });
      this.actualitesGateway.emitPostLiked(id, updated.likes);
      return updated;
    } catch {
      throw new NotFoundException('Post non trouvé');
    }
  }

  // ─── Commentaires ───

  /**
   * Ajoute un commentaire (ou une réponse). L'auteur affiché est déduit du
   * compte connecté ; une réponse est toujours rattachée à un commentaire
   * racine du même post (un seul niveau d'imbrication).
   */
  async addCommentaire(
    postId: string,
    dto: CreateCommentaireDto,
    user: Parameters<typeof auteurDeCommentaire>[0] & { id: string },
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post non trouvé');

    let parentId: string | undefined;
    if (dto.parentId) {
      const parent = await this.prisma.commentaire.findFirst({
        where: { id: dto.parentId, postId },
        select: { id: true, parentId: true },
      });
      if (!parent) throw new NotFoundException('Commentaire parent non trouvé');
      parentId = parent.parentId ?? parent.id;
    }

    const { auteur, role } = auteurDeCommentaire(user, dto.auteur);
    const comm = await this.prisma.commentaire.create({
      data: {
        postId,
        auteurId: user.id,
        auteur,
        role,
        contenu: dto.contenu.trim(),
        parentId,
      },
      include: { reponses: true },
    });
    this.actualitesGateway.emitNewCommentaire(postId, comm);
    return comm;
  }

  async removeCommentaire(commentaireId: string) {
    try {
      const comm = await this.prisma.commentaire.delete({
        where: { id: commentaireId },
      });
      this.actualitesGateway.emitCommentaireDeleted(comm.postId, comm.id);
      return comm;
    } catch {
      throw new NotFoundException('Commentaire non trouvé');
    }
  }
}
