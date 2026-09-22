import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Query,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { TAILLE_MAX_UPLOAD, UploadService } from './upload.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('upload')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Types, taille et dossier autorisés dépendent du rôle (voir UploadService).
   * La limite ci-dessous coupe l'envoi avant qu'un fichier énorme soit chargé en mémoire.
   */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: TAILLE_MAX_UPLOAD, files: 1, fields: 5 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'type',
    required: false,
    description:
      'Dossier de destination (ex: actualites, formations, bourses, avatars, documents)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        type: {
          type: 'string',
          description:
            'Dossier de destination (ex: actualites, formations, bourses, avatars, documents)',
        },
        folder: {
          type: 'string',
          description: 'Alias pour le dossier de destination',
        },
      },
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
    @Query('type') typeQuery?: string,
    @Query('folder') folderQuery?: string,
    @Body('type') typeBody?: string,
    @Body('folder') folderBody?: string,
  ) {
    if (!file) {
      throw new BadRequestException("Aucun fichier n'a été fourni");
    }
    const targetFolder = typeQuery || folderQuery || typeBody || folderBody;
    return this.uploadService.uploadFile(file, targetFolder, user);
  }
}
