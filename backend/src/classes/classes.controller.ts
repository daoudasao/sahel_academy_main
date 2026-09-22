import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ClassesService, ROLES_GESTION_CLASSES } from './classes.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateCommentaireClasseDto } from './dto/create-commentaire.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';

/** Peuvent publier : la gestion, et un formateur (dans SES formations, vérifié par le service). */
const ROLES_PUBLICATION: Role[] = [...ROLES_GESTION_CLASSES, Role.FORMATEUR];

// Une « classe » = une formation. Son contenu est exposé sous /classes/:formationId.
// L'accès (inscrit, formateur, équipe) est vérifié par le service.
@ApiTags('classes')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  // ─── Mes classes (inscrit ou formateur) ───

  @Get('mes-classes')
  getMesClasses(@CurrentUser() user: User) {
    return this.classesService.getMesClasses(user);
  }

  // ─── Messages (flux) ───

  @Get(':formationId/messages')
  getMessages(
    @Param('formationId') formationId: string,
    @CurrentUser() user: User,
  ) {
    return this.classesService.getMessages(formationId, user);
  }

  @Post(':formationId/messages')
  createMessage(
    @Param('formationId') formationId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: User,
  ) {
    return this.classesService.createMessage(formationId, dto, user);
  }

  @Delete('messages/:messageId')
  removeMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: User,
  ) {
    return this.classesService.removeMessage(messageId, user);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('messages/:messageId/commentaires')
  addCommentaire(
    @Param('messageId') messageId: string,
    @Body() dto: CreateCommentaireClasseDto,
    @CurrentUser() user: User,
  ) {
    return this.classesService.addCommentaire(messageId, dto, user);
  }

  // ─── Documents (cours) ───

  @Get(':formationId/documents')
  getDocuments(
    @Param('formationId') formationId: string,
    @CurrentUser() user: User,
  ) {
    return this.classesService.getDocuments(formationId, user);
  }

  @Roles(...ROLES_PUBLICATION)
  @Post(':formationId/documents')
  createDocument(
    @Param('formationId') formationId: string,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: User,
  ) {
    return this.classesService.createDocument(formationId, dto, user);
  }

  @Roles(...ROLES_PUBLICATION)
  @Delete('documents/:documentId')
  removeDocument(
    @Param('documentId') documentId: string,
    @CurrentUser() user: User,
  ) {
    return this.classesService.removeDocument(documentId, user);
  }
}
