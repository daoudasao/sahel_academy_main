import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { SkipAudit } from '../audit/skip-audit.decorator';

@ApiTags('support')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ─── Côté client (utilisateur connecté) ───

  @Get('messages')
  getMyMessages(@CurrentUser() user: User) {
    return this.supportService.getMyMessages(user.id);
  }

  // Messagerie : déjà historisée dans support_messages (auteur, date).
  @SkipAudit()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('messages')
  sendMessage(
    @CurrentUser() user: User,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.supportService.sendAsClient(user.id, dto);
  }

  @Delete('messages/:id')
  deleteMessage(@Param('id') id: string, @CurrentUser() user: User) {
    return this.supportService.deleteMessage(id, user);
  }

  // ─── Côté support (Admin/Staff) ───

  @Roles(Role.CHEF_CENTRE, Role.STAFF, Role.SUPPORT)
  @Get('conversations')
  getConversations() {
    return this.supportService.getConversations();
  }

  @Roles(Role.CHEF_CENTRE, Role.STAFF, Role.SUPPORT)
  @Get('conversations/:userId')
  getConversation(@Param('userId') userId: string) {
    return this.supportService.getConversation(userId);
  }

  @Roles(Role.CHEF_CENTRE, Role.STAFF, Role.SUPPORT)
  @SkipAudit()
  @Post('conversations/:userId/messages')
  replyToUser(
    @Param('userId') userId: string,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.supportService.sendAsSupport(userId, dto);
  }
}
