import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PaiementsService } from './paiements.service';
import { CreateEcheanceDto } from './dto/create-echeance.dto';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { UpdatePaiementDto } from './dto/update-paiement.dto';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { estEquipe } from '../auth/roles.util';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { AuditContexte } from '../audit/audit-contexte.decorator';

@ApiTags('paiements')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('paiements')
export class PaiementsController {
  constructor(private readonly paiementsService: PaiementsService) {}

  @AuditContexte('echeance')
  @Roles(Role.ADMIN, Role.COMPTABLE)
  @Post()
  createEcheance(@Body() createEcheanceDto: CreateEcheanceDto) {
    return this.paiementsService.createEcheance(createEcheanceDto);
  }

  /**
   * L'équipe consulte les échéances de tout le monde (filtrables) ;
   * les autres utilisateurs ne voient que les leurs, quel que soit `userId`.
   */
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'formationId', required: false })
  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('userId') userId?: string,
    @Query('formationId') formationId?: string,
  ) {
    const cible = estEquipe(user) ? userId : user.id;
    return this.paiementsService.findAllEcheances(cible, formationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const echeance = await this.paiementsService.findEcheance(id);
    if (!estEquipe(user) && echeance.userId !== user.id) {
      // Même réponse qu'une échéance inexistante : on ne confirme rien.
      throw new NotFoundException('Échéance non trouvée');
    }
    return echeance;
  }

  // Contexte d'audit « paiement » : montant, élève et échéance ; ancien et
  // nouveau montant pour une modification, montant supprimé pour une
  // suppression.
  @AuditContexte('paiement')
  @Roles(Role.ADMIN, Role.STAFF, Role.COMPTABLE)
  @Post(':id/historique')
  addPaiement(@Param('id') id: string, @Body() createPaiementDto: CreatePaiementDto) {
    return this.paiementsService.addPaiement(id, createPaiementDto);
  }

  @AuditContexte('paiement')
  @Roles(Role.ADMIN, Role.COMPTABLE)
  @Delete(':id/historique/:hId')
  removePaiement(@Param('id') id: string, @Param('hId') hId: string) {
    return this.paiementsService.removePaiement(hId);
  }

  @AuditContexte('paiement')
  @Roles(Role.ADMIN, Role.STAFF, Role.COMPTABLE)
  @Patch('historique/:hId')
  updatePaiement(@Param('hId') hId: string, @Body() updatePaiementDto: UpdatePaiementDto) {
    return this.paiementsService.updatePaiement(hId, updatePaiementDto);
  }
}
