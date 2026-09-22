import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { StatutBourse } from '@prisma/client';
import { CreateChampDto } from './create-champ.dto';

export class CreateBourseDto {
  @ApiProperty({ example: 'Bourse Excellence 2026' })
  @IsString()
  titre: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  formationId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  departementId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: '2026-08-01T00:00:00Z' })
  @IsDateString()
  datePublication: string;

  @ApiProperty({ example: '2026-09-30T23:59:59Z' })
  @IsDateString()
  dateLimite: string;

  @ApiProperty({ enum: StatutBourse, required: false })
  @IsEnum(StatutBourse)
  @IsOptional()
  statut?: StatutBourse;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  documentAdmissionUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  documentAdmissionNom?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  messageAdmission?: string;

  @ApiProperty({ type: [CreateChampDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateChampDto)
  champs?: CreateChampDto[];
}
