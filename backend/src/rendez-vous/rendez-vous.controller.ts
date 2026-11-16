import {
  Body,
  Controller,
  Delete,
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
import { Role, StatutRendezVous } from '@prisma/client';
import type { User } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RendezVousService, ROLES_RENDEZ_VOUS } from './rendez-vous.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { UpdateRendezVousDto } from './dto/update-rendez-vous.dto';

// Tout utilisateur connecté prend (et annule) ses rendez-vous depuis l'app ;
// l'équipe les suit et change leur statut depuis le dashboard.
@ApiTags('rendez-vous')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('rendez-vous')
export class RendezVousController {
  constructor(private readonly rendezVousService: RendezVousService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  prendre(@Body() dto: CreateRendezVousDto, @CurrentUser() user: User) {
    return this.rendezVousService.prendre(user.id, dto);
  }

  @Get('mes')
  mesRendezVous(@CurrentUser() user: User) {
    return this.rendezVousService.mesRendezVous(user.id);
  }

  @Patch('mes/:id/annuler')
  annulerMien(@Param('id') id: string, @CurrentUser() user: User) {
    return this.rendezVousService.annulerMien(id, user.id);
  }

  @Roles(...ROLES_RENDEZ_VOUS)
  @Get()
  lister(
    @Query('statut', new ParseEnumPipe(StatutRendezVous, { optional: true }))
    statut?: StatutRendezVous,
  ) {
    return this.rendezVousService.lister(statut);
  }

  @Roles(...ROLES_RENDEZ_VOUS)
  @Patch(':id')
  modifier(
    @Param('id') id: string,
    @Body() dto: UpdateRendezVousDto,
    @CurrentUser() user: User,
  ) {
    return this.rendezVousService.modifier(id, dto, user);
  }

  /** Envoie le rendez-vous à la corbeille (restaurable). */
  @Roles(Role.CHEF_CENTRE)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.rendezVousService.remove(id, user);
  }
}
