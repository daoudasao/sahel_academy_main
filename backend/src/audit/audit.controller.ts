import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

/**
 * Consultation du journal d'audit : réservée au SUPER_ADMIN.
 * Lecture seule — une trace d'audit ne se modifie ni ne se supprime.
 */
@ApiTags('audit')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  lister(@Query() query: ListAuditLogsDto) {
    return this.audit.lister(query);
  }

  @Get('filtres')
  filtres() {
    return this.audit.filtres();
  }

  @Get('resume')
  resume() {
    return this.audit.resume();
  }
}
