import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StatutFormation } from '@prisma/client';

export class CreateFormationDto {
  @ApiProperty({ example: 'Développement Web Fullstack' })
  @IsString()
  titre: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'dept_id_123' })
  @IsString()
  departementId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  formateurId?: string;

  @ApiProperty({ example: 50000, required: false })
  @IsNumber()
  @IsOptional()
  prixInscription?: number;

  @ApiProperty({ example: 25000, required: false })
  @IsNumber()
  @IsOptional()
  prixMensualite?: number;

  @ApiProperty({ example: 70, required: false })
  @IsNumber()
  @IsOptional()
  pourcentageFormateur?: number;

  @ApiProperty({ example: 6, required: false })
  @IsNumber()
  @IsOptional()
  dureeMois?: number;

  @ApiProperty({ example: 'Débutant', required: false })
  @IsString()
  @IsOptional()
  niveau?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  estBourse?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ enum: StatutFormation, required: false })
  @IsEnum(StatutFormation)
  @IsOptional()
  statut?: StatutFormation;
}
