import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Logger, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfilDto } from './dto/update-profil.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { CreateInscriptionDto } from './dto/create-inscription.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { aUnRole, estEquipe, estSuperAdmin } from '../auth/roles.util';
import { SkipAudit } from '../audit/skip-audit.decorator';
import type { User } from '@prisma/client';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /** Un utilisateur n'accède qu'à ses propres données, sauf s'il fait partie de l'équipe. */
  private verifierAcces(currentUser: User, userId: string) {
    if (userId !== currentUser.id && !estEquipe(currentUser)) {
      throw new ForbiddenException('Accès refusé.');
    }
  }

  /**
   * Un compte SUPER_ADMIN ne peut être modifié, supprimé ou voir son mot de
   * passe réinitialisé que par un autre SUPER_ADMIN (sinon un CHEF_CENTRE pourrait
   * neutraliser celui qui le contrôle).
   */
  private async protegerSuperAdmin(currentUser: User, cibleId: string) {
    if (estSuperAdmin(currentUser)) return;
    const cible = await this.usersService.findOne(cibleId);
    if (estSuperAdmin(cible)) {
      throw new ForbiddenException('Seul un super administrateur peut agir sur ce compte.');
    }
  }

  @Roles(Role.CHEF_CENTRE)
  @Post()
  create(@CurrentUser() currentUser: User, @Body() createUserDto: CreateUserDto) {
    if (createUserDto.role === Role.SUPER_ADMIN && !estSuperAdmin(currentUser)) {
      throw new ForbiddenException('Seul un super administrateur peut attribuer ce rôle.');
    }
    return this.usersService.create(createUserDto);
  }

  @Roles(Role.CHEF_CENTRE, Role.STAFF, Role.SUPPORT, Role.RESPONSABLE_PEDAGOGIQUE, Role.COMPTABLE, Role.COMMUNITY_MANAGER)
  @ApiQuery({ name: 'role', enum: Role, required: false })
  @Get()
  findAll(@Query('role') role?: Role) {
    return this.usersService.findAll(role);
  }

  @Get('me')
  getProfile(@CurrentUser() user: User) {
    return this.usersService.findOne(user.id);
  }

  @Patch('me')
  updateMyProfile(
    @CurrentUser() user: User,
    @Body() updateProfilDto: UpdateProfilDto,
  ) {
    return this.usersService.update(user.id, updateProfilDto);
  }

  /**
   * Suppression de son propre compte (exigence Google Play). Déclarée avant
   * `DELETE :id` pour que « me » ne soit pas pris pour un identifiant.
   * Les comptes de l'équipe passent par un super administrateur.
   */
  @Delete('me')
  supprimerMonCompte(@CurrentUser() user: User) {
    if (estEquipe(user)) {
      throw new ForbiddenException(
        "Un compte de l'équipe ne peut pas être supprimé depuis l'application. Contactez un super administrateur.",
      );
    }
    return this.usersService.supprimerMonCompte(user.id);
  }

  @SkipAudit()
  @Patch('fcm-token')
  updateFcmToken(
    @CurrentUser() user: User,
    @Body() updateFcmTokenDto: UpdateFcmTokenDto,
  ) {
    this.logger.log(`Mise à jour du token push pour l'utilisateur ${user.id}`);
    return this.usersService.updateFcmToken(user.id, updateFcmTokenDto.fcmToken);
  }

  @Get(':id')
  findOne(@CurrentUser() currentUser: User, @Param('id') id: string) {
    this.verifierAcces(currentUser, id);
    return this.usersService.findOne(id);
  }

  @Roles(Role.CHEF_CENTRE, Role.STAFF)
  @Patch(':id')
  async update(
    @CurrentUser() currentUser: User,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // aUnRole : un SUPER_ADMIN est aussi administrateur.
    const estAdmin = aUnRole(currentUser, [Role.CHEF_CENTRE]);

    if (updateUserDto.role !== undefined) {
      if (id === currentUser.id) {
        throw new ForbiddenException('Vous ne pouvez pas modifier votre propre rôle.');
      }
      // Attribuer un rôle (dont CHEF_CENTRE) est réservé aux chefs de centre.
      if (!estAdmin) {
        throw new ForbiddenException('Seul un administrateur peut modifier un rôle.');
      }
      // Et SUPER_ADMIN ne peut être attribué que par un SUPER_ADMIN.
      if (updateUserDto.role === Role.SUPER_ADMIN && !estSuperAdmin(currentUser)) {
        throw new ForbiddenException('Seul un super administrateur peut attribuer ce rôle.');
      }
    }

    if (!estSuperAdmin(currentUser)) {
      const cible = await this.usersService.findOne(id);
      // Un compte SUPER_ADMIN n'est modifiable que par un SUPER_ADMIN.
      if (estSuperAdmin(cible)) {
        throw new ForbiddenException('Seul un super administrateur peut modifier ce compte.');
      }
      // Un non-admin ne peut pas modifier un compte administrateur
      // (e-mail, activation…), sinon il pourrait en prendre le contrôle.
      if (!estAdmin && cible.role === Role.CHEF_CENTRE) {
        throw new ForbiddenException('Seul un administrateur peut modifier ce compte.');
      }
    }

    return this.usersService.update(id, updateUserDto);
  }

  /** Réinitialise le mot de passe d'un utilisateur (administrateur uniquement). */
  @Roles(Role.CHEF_CENTRE)
  @Patch(':id/password')
  async setPassword(
    @CurrentUser() currentUser: User,
    @Param('id') id: string,
    @Body() dto: SetPasswordDto,
  ) {
    await this.protegerSuperAdmin(currentUser, id);
    return this.usersService.setPassword(id, dto.newPassword);
  }

  @Roles(Role.CHEF_CENTRE)
  @Delete(':id')
  async remove(@CurrentUser() currentUser: User, @Param('id') id: string) {
    await this.protegerSuperAdmin(currentUser, id);
    return this.usersService.remove(id);
  }

  @Get(':id/inscriptions')
  getInscriptions(@CurrentUser() currentUser: User, @Param('id') id: string) {
    this.verifierAcces(currentUser, id);
    return this.usersService.getInscriptions(id);
  }

  @Roles(Role.CHEF_CENTRE)
  @Post(':id/inscriptions')
  inscrire(@Param('id') id: string, @Body() createInscriptionDto: CreateInscriptionDto) {
    return this.usersService.inscrire(id, createInscriptionDto);
  }

  @Get(':id/candidatures')
  getCandidatures(@CurrentUser() currentUser: User, @Param('id') id: string) {
    this.verifierAcces(currentUser, id);
    return this.usersService.getCandidatures(id);
  }

  @Roles(Role.CHEF_CENTRE)
  @Patch(':id/inscriptions/:formationId')
  updateInscriptionStatus(
    @Param('id') userId: string,
    @Param('formationId') formationId: string,
    @Body('statut') statut: string,
  ) {
    return this.usersService.updateInscriptionStatus(userId, formationId, statut);
  }

  @Roles(Role.CHEF_CENTRE)
  @Delete(':id/inscriptions/:formationId')
  removeInscription(
    @Param('id') userId: string,
    @Param('formationId') formationId: string,
  ) {
    return this.usersService.removeInscription(userId, formationId);
  }
}
