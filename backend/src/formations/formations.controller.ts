import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { FormationsService } from './formations.service';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { aUnRole } from '../auth/roles.util';
import { Role, StatutFormation } from '@prisma/client';
import type { User } from '@prisma/client';

/**
 * Rôles qui voient le détail complet d'une formation (inscrits, demandes,
 * fiche complète du formateur) — alignés sur la page Formations du dashboard.
 */
const ROLES_DETAIL_FORMATION: Role[] = [
  Role.ADMIN,
  Role.STAFF,
  Role.RESPONSABLE_PEDAGOGIQUE,
];

@ApiTags('formations')
@Controller('formations')
export class FormationsController {
  constructor(private readonly formationsService: FormationsService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RESPONSABLE_PEDAGOGIQUE)
  @Post()
  create(@Body() createFormationDto: CreateFormationDto) {
    return this.formationsService.create(createFormationDto);
  }

  @ApiQuery({ name: 'departementId', required: false })
  @ApiQuery({ name: 'statut', enum: StatutFormation, required: false })
  @UseGuards(OptionalAuthGuard)
  @Get()
  findAll(
    @CurrentUser() user: User | null,
    @Query('departementId') departementId?: string,
    @Query('statut') statut?: StatutFormation,
  ) {
    return this.formationsService.findAll(
      departementId,
      statut,
      aUnRole(user, ROLES_DETAIL_FORMATION),
    );
  }

  // ─── Demandes d'inscriptions ───
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Get('demandes/me')
  getMesDemandes(@CurrentUser() user: User) {
    return this.formationsService.getDemandesForUser(user.id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF, Role.SUPPORT, Role.RESPONSABLE_PEDAGOGIQUE)
  @Get('demandes/all')
  getDemandes() {
    return this.formationsService.getDemandes();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF, Role.SUPPORT, Role.RESPONSABLE_PEDAGOGIQUE)
  @Patch('demandes/:demandeId/valider')
  validerDemande(@Param('demandeId') demandeId: string) {
    return this.formationsService.validerDemande(demandeId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF, Role.SUPPORT, Role.RESPONSABLE_PEDAGOGIQUE)
  @Patch('demandes/:demandeId/refuser')
  refuserDemande(@Param('demandeId') demandeId: string) {
    return this.formationsService.refuserDemande(demandeId);
  }

  @UseGuards(OptionalAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User | null) {
    return this.formationsService.findOne(
      id,
      aUnRole(user, ROLES_DETAIL_FORMATION),
    );
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RESPONSABLE_PEDAGOGIQUE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFormationDto: UpdateFormationDto) {
    return this.formationsService.update(id, updateFormationDto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RESPONSABLE_PEDAGOGIQUE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.formationsService.remove(id);
  }

  // ─── Soumission de demande par l'élève ───
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Post(':id/demande')
  creerDemande(@Param('id') id: string, @CurrentUser() user: User) {
    return this.formationsService.creerDemande(id, user.id);
  }
}
