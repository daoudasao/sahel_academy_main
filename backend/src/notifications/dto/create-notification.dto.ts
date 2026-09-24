import { IsString, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TypeNotification } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({ enum: TypeNotification })
  @IsEnum(TypeNotification)
  type: TypeNotification;

  @ApiProperty({ example: 'Nouveau cours disponible' })
  @IsString()
  titre: string;

  @ApiProperty({ example: 'Le cours de React est en ligne.' })
  @IsString()
  message: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ example: 'global', required: false })
  @IsString()
  @IsOptional()
  cible?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cibleId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cibleNom?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  envoyePar?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  documentUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  documentNom?: string;

  /**
   * Écran de l'app ouvert au clic (chemin interne, ex. « /bourse/abc »).
   * Déduit de la cible s'il n'est pas fourni.
   */
  @ApiProperty({ required: false, example: '/support' })
  @IsString()
  @IsOptional()
  @Matches(/^\/[A-Za-z0-9/_-]*$/, {
    message: 'route doit être un chemin interne (ex. /support).',
  })
  route?: string;
}
