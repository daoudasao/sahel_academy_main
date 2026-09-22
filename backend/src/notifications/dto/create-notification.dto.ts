import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
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
}
