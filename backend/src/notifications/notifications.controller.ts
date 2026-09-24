import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { SkipAudit } from '../audit/skip-audit.decorator';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles(Role.CHEF_CENTRE, Role.STAFF, Role.COMMUNITY_MANAGER)
  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.notificationsService.findAllForUser(user.id);
  }

  @Get('urgentes')
  findUrgentes(@CurrentUser() user: User) {
    return this.notificationsService.findUrgentesForUser(user.id);
  }

  @SkipAudit()
  @Post('urgentes/read')
  marquerAlertesVues(
    @CurrentUser() user: User,
    @Body('alerteIds') alerteIds: string[],
  ) {
    return this.notificationsService.marquerAlertesVues(user.id, alerteIds);
  }

  @Roles(Role.CHEF_CENTRE, Role.STAFF, Role.COMMUNITY_MANAGER)
  @Get('admin')
  findAllAdmin() {
    return this.notificationsService.findAllAdmin();
  }

  /** Suppression définitive pour tous les destinataires (dashboard). */
  @Roles(Role.CHEF_CENTRE, Role.STAFF, Role.COMMUNITY_MANAGER)
  @Delete('admin/:id')
  removeDefinitivement(@Param('id') id: string) {
    return this.notificationsService.removeDefinitivement(id);
  }

  @SkipAudit()
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  /** Côté utilisateur : retire la notification de SA liste uniquement. */
  @SkipAudit()
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.remove(id, user.id);
  }
}
