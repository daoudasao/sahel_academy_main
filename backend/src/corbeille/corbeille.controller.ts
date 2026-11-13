import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CorbeilleService } from './corbeille.service';

/**
 * Corbeille du dashboard : voir les éléments supprimés et les restaurer
 * (chef de centre). La suppression définitive est réservée au super admin
 * (le RolesGuard laisse toujours passer SUPER_ADMIN).
 */
@ApiTags('corbeille')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('corbeille')
export class CorbeilleController {
  constructor(private readonly corbeilleService: CorbeilleService) {}

  @Roles(Role.CHEF_CENTRE)
  @Get()
  lister() {
    return this.corbeilleService.lister();
  }

  @Roles(Role.CHEF_CENTRE)
  @Post(':type/:id/restaurer')
  restaurer(@Param('type') type: string, @Param('id') id: string) {
    return this.corbeilleService.restaurer(
      this.corbeilleService.verifierType(type),
      id,
    );
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete(':type/:id')
  supprimerDefinitivement(
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.corbeilleService.supprimerDefinitivement(
      this.corbeilleService.verifierType(type),
      id,
    );
  }
}
