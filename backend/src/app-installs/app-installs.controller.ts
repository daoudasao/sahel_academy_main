import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AppInstallsService } from './app-installs.service';
import { PingInstallDto } from './dto/ping-install.dto';
import { SkipAudit } from '../audit/skip-audit.decorator';

// Rôles autorisés à consulter les statistiques d'installation.
const ROLES_ADMIN = [
  'SUPER_ADMIN',
  'CHEF_CENTRE',
  'STAFF',
] as const;

@ApiTags('app-installs')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('app-installs')
export class AppInstallsController {
  constructor(private readonly service: AppInstallsService) {}

  /**
   * Appelé par l'app (Flutter / PWA) à chaque lancement pour signaler
   * l'appareil courant. Crée l'entrée au premier appel puis met à jour
   * `dernierAcces` les fois suivantes.
   */
  @SkipAudit()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('ping')
  ping(@Body() dto: PingInstallDto, @CurrentUser() user: User) {
    return this.service.ping(user.id, dto);
  }

  /** Statistiques agrégées (cartes du dashboard). */
  @Roles(...ROLES_ADMIN)
  @Get('stats')
  stats() {
    return this.service.stats();
  }

  /** Liste paginée des installations (tableau du dashboard). */
  @Roles(...ROLES_ADMIN)
  @Get()
  list(
    @Query('plateforme') plateforme?: string,
    @Query('typeInstallation') typeInstallation?: string,
    @Query('page') page?: number,
    @Query('limite') limite?: number,
  ) {
    return this.service.list({ plateforme, typeInstallation, page, limite });
  }
}
