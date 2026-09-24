import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StatutBourse } from '@prisma/client';
import { BoursesService } from './bourses.service';
import { CreateBourseDto } from './dto/create-bourse.dto';
import { UpdateBourseDto } from './dto/update-bourse.dto';
import { CreateChampDto } from './dto/create-champ.dto';
import { CreateCandidatureDto } from './dto/create-candidature.dto';
import { UpdateCandidatureDto } from './dto/update-candidature.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { aUnRole } from '../auth/roles.util';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';

/** Rôles qui traitent les candidatures (alignés sur le dashboard). */
const ROLES_CANDIDATURES: Role[] = [Role.CHEF_CENTRE, Role.STAFF, Role.SUPPORT];

@ApiTags('bourses')
@Controller('bourses')
export class BoursesController {
  constructor(private readonly boursesService: BoursesService) {}

  // ─── Lecture publique (détail complet pour l'équipe) ───

  @UseGuards(OptionalAuthGuard)
  @Get()
  findAll(
    @CurrentUser() user: User | null,
    @Query('all') all?: string,
    @Query('statut') statut?: StatutBourse,
  ) {
    const inclureTous = all === 'true' || all === '1';
    return this.boursesService.findAll(
      statut,
      inclureTous,
      aUnRole(user, ROLES_CANDIDATURES),
    );
  }

  @UseGuards(OptionalAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User | null) {
    const pourEquipe = aUnRole(user, ROLES_CANDIDATURES);
    return this.boursesService.findOne(id, {
      avecCandidatures: pourEquipe,
      pourEquipe,
      userId: user?.id,
    });
  }

  // ─── Candidatures ───

  // Un étudiant consulte SES propres candidatures (route scopée à l'utilisateur
  // connecté). Déclarée avant `:id/candidatures` pour éviter toute ambiguïté.
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Get('candidatures/me')
  getMesCandidatures(@CurrentUser() user: User) {
    return this.boursesService.getCandidaturesForUser(user.id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ROLES_CANDIDATURES)
  @Get(':id/candidatures')
  getCandidatures(@Param('id') id: string) {
    return this.boursesService.getCandidatures(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/candidatures')
  createCandidature(
    @Param('id') id: string,
    @Body() dto: CreateCandidatureDto,
    @CurrentUser() user: User,
  ) {
    return this.boursesService.createCandidature(id, dto, user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ROLES_CANDIDATURES)
  @Patch('candidatures/:candidatureId')
  updateCandidatureStatut(
    @Param('candidatureId') candidatureId: string,
    @Body() dto: UpdateCandidatureDto,
  ) {
    return this.boursesService.updateCandidatureStatut(candidatureId, dto);
  }

  // ─── Gestion (Admin) ───

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.CHEF_CENTRE)
  @Post()
  create(@Body() createBourseDto: CreateBourseDto) {
    return this.boursesService.create(createBourseDto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.CHEF_CENTRE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBourseDto: UpdateBourseDto) {
    return this.boursesService.update(id, updateBourseDto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.CHEF_CENTRE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.boursesService.remove(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.CHEF_CENTRE)
  @Post(':id/champs')
  addChamp(@Param('id') id: string, @Body() dto: CreateChampDto) {
    return this.boursesService.addChamp(id, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.CHEF_CENTRE)
  @Delete(':id/champs/:champId')
  removeChamp(@Param('champId') champId: string) {
    return this.boursesService.removeChamp(champId);
  }
}
