import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ActualitesService } from './actualites.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { SkipAudit } from '../audit/skip-audit.decorator';

@ApiTags('actualites')
@Controller('actualites')
export class ActualitesController {
  constructor(private readonly actualitesService: ActualitesService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.FORMATEUR, Role.STAFF, Role.COMMUNITY_MANAGER)
  @Post()
  create(@Body() createPostDto: CreatePostDto) {
    return this.actualitesService.create(createPostDto);
  }

  // Accessible à tous (fil public)
  @Get()
  findAll() {
    return this.actualitesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.actualitesService.findOne(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.FORMATEUR, Role.STAFF, Role.COMMUNITY_MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.actualitesService.update(id, updatePostDto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.FORMATEUR, Role.STAFF, Role.COMMUNITY_MANAGER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.actualitesService.remove(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @SkipAudit()
  @Post(':id/like')
  like(@Param('id') id: string) {
    return this.actualitesService.like(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @SkipAudit()
  @Post(':id/unlike')
  unlike(@Param('id') id: string) {
    return this.actualitesService.unlike(id);
  }

  // ─── Commentaires ───

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/commentaires')
  addCommentaire(
    @Param('id') id: string,
    @Body() dto: CreateCommentaireDto,
    @CurrentUser() user: User,
  ) {
    return this.actualitesService.addCommentaire(id, dto, user);
  }

  // Modération : suppression d'un commentaire (Admin/Formateur/Community Manager)
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.FORMATEUR, Role.STAFF, Role.COMMUNITY_MANAGER)
  @Delete(':id/commentaires/:cId')
  removeCommentaire(@Param('cId') cId: string) {
    return this.actualitesService.removeCommentaire(cId);
  }
}
