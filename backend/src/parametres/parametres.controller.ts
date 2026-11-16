import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParametresService } from './parametres.service';
import { UpdateParametresDto } from './dto/update-parametres.dto';

/**
 * Paramètres globaux (numéro WhatsApp du service client…).
 * Lecture publique (site, app, sans connexion) ; modification réservée au
 * chef de centre (et au super admin, qui passe toujours le RolesGuard).
 */
@ApiTags('parametres')
@Controller('parametres')
export class ParametresController {
  constructor(private readonly parametresService: ParametresService) {}

  @Get()
  lire() {
    return this.parametresService.lire();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.CHEF_CENTRE)
  @Patch()
  modifier(@Body() dto: UpdateParametresDto, @CurrentUser() user: User) {
    return this.parametresService.modifier(dto, user);
  }
}
