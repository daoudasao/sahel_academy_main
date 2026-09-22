import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EspaceFormateurService } from './espace-formateur.service';

// Espace du formateur connecté : aucune route ne prend d'identifiant de
// formateur, tout est déduit de la session.
@ApiTags('espace-formateur')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.FORMATEUR)
@Controller('espace-formateur')
export class EspaceFormateurController {
  constructor(private readonly service: EspaceFormateurService) {}

  @Get('tableau-de-bord')
  tableauDeBord(@CurrentUser() user: User) {
    return this.service.tableauDeBord(user.id);
  }

  @Get('classes/:formationId/apprenants')
  apprenants(
    @Param('formationId') formationId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.apprenants(user.id, formationId);
  }
}
