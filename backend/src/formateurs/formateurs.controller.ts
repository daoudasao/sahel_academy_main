import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { FormateursService } from './formateurs.service';
import { CreateFormateurDto } from './dto/create-formateur.dto';
import { CreateCompteFormateurDto } from './dto/create-compte-formateur.dto';
import { AuditContexte } from '../audit/audit-contexte.decorator';
import { UpdateFormateurDto } from './dto/update-formateur.dto';
import { CreateFicheDto } from './dto/create-fiche.dto';
import { UpdateFicheDto } from './dto/update-fiche.dto';
import { CreateVersementDto } from './dto/create-versement.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';

/** Rôles qui gèrent les formateurs et leurs salaires (alignés sur le dashboard). */
const ROLES_GESTION_FORMATEURS: Role[] = [
  Role.ADMIN,
  Role.STAFF,
  Role.RESPONSABLE_PEDAGOGIQUE,
  Role.COMPTABLE,
];

@ApiTags('formateurs')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Roles(...ROLES_GESTION_FORMATEURS)
@Controller('formateurs')
export class FormateursController {
  constructor(private readonly formateursService: FormateursService) {}

  /**
   * Crée le compte de connexion d'un formateur (rôle FORMATEUR imposé). Passe
   * par Nest plutôt que par le plugin admin de better-auth : mêmes droits que
   * la gestion des formateurs, et action tracée dans le journal d'audit.
   */
  @Post('compte')
  creerCompte(@Body() dto: CreateCompteFormateurDto) {
    return this.formateursService.creerCompte(dto);
  }

  @AuditContexte('formateur')
  @Post()
  create(@Body() createFormateurDto: CreateFormateurDto) {
    return this.formateursService.create(createFormateurDto);
  }

  @Get()
  findAll() {
    return this.formateursService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formateursService.findOne(id);
  }

  /** La gestion voit les gains de tous ; un formateur uniquement les siens. */
  @Roles(...ROLES_GESTION_FORMATEURS, Role.FORMATEUR)
  @Get(':id/gains')
  async getGains(@Param('id') id: string, @CurrentUser() user: User) {
    if (user.role === Role.FORMATEUR) {
      const formateur = await this.formateursService.findOne(id);
      if (!formateur.userId || formateur.userId !== user.id) {
        throw new ForbiddenException('Accès refusé.');
      }
    }
    return this.formateursService.getGains(id);
  }

  // Contexte d'audit : trace l'ancien et le nouveau salaire mensuel.
  @AuditContexte('formateur')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFormateurDto: UpdateFormateurDto,
  ) {
    return this.formateursService.update(id, updateFormateurDto);
  }

  @AuditContexte('formateur')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.formateursService.remove(id);
  }

  // ─── Salaires : fiches ───

  @Get(':id/salaires')
  getSalaires(@Param('id') id: string) {
    return this.formateursService.getSalaires(id);
  }

  @AuditContexte('ficheSalaire')
  @Post(':id/salaires')
  createFiche(@Param('id') id: string, @Body() dto: CreateFicheDto) {
    return this.formateursService.createFiche(id, dto);
  }

  @AuditContexte('ficheSalaire')
  @Patch('salaires/:ficheId')
  updateFiche(@Param('ficheId') ficheId: string, @Body() dto: UpdateFicheDto) {
    return this.formateursService.updateFiche(ficheId, dto);
  }

  @AuditContexte('ficheSalaire')
  @Delete('salaires/:ficheId')
  removeFiche(@Param('ficheId') ficheId: string) {
    return this.formateursService.removeFiche(ficheId);
  }

  // ─── Salaires : versements ───

  // Le montant réellement versé peut être plafonné au reste dû : l'état
  // « après » du journal fait foi, pas le montant saisi.
  @AuditContexte('versementSalaire')
  @Post('salaires/:ficheId/versements')
  addVersement(
    @Param('ficheId') ficheId: string,
    @Body() dto: CreateVersementDto,
  ) {
    return this.formateursService.addVersement(ficheId, dto);
  }

  @AuditContexte('versementSalaire')
  @Delete('salaires/:ficheId/versements/:vId')
  removeVersement(@Param('vId') vId: string) {
    return this.formateursService.removeVersement(vId);
  }
}
