import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { StatutSignalement } from '@prisma/client';
import type { User } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SignalementsService, ROLES_MODERATION } from './signalements.service';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { TraiterSignalementDto } from './dto/traiter-signalement.dto';

// Tout utilisateur connecté signale ; la modération (dashboard) traite.
@ApiTags('signalements')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('signalements')
export class SignalementsController {
  constructor(private readonly signalementsService: SignalementsService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  signaler(@Body() dto: CreateSignalementDto, @CurrentUser() user: User) {
    return this.signalementsService.signaler(dto, user);
  }

  @Roles(...ROLES_MODERATION)
  @Get()
  lister(
    @Query('statut', new ParseEnumPipe(StatutSignalement, { optional: true }))
    statut?: StatutSignalement,
  ) {
    return this.signalementsService.lister(statut);
  }

  /** Nombre de signalements en attente (pastille du menu). */
  @Roles(...ROLES_MODERATION)
  @Get('compteur')
  compteur() {
    return this.signalementsService.compteurEnAttente();
  }

  @Roles(...ROLES_MODERATION)
  @Patch(':id')
  traiter(
    @Param('id') id: string,
    @Body() dto: TraiterSignalementDto,
    @CurrentUser() user: User,
  ) {
    return this.signalementsService.traiter(id, dto, user);
  }
}
