import {
  IsDateString,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Soit un créneau ponctuel (`dateHeure`), soit un créneau hebdomadaire
 * (`jourSemaine` + `heure`).
 */
export class CreateCreneauDto {
  @ApiProperty({ example: '2026-09-08T09:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  dateHeure?: string;

  @ApiProperty({
    example: 1,
    description: '1 = lundi … 7 = dimanche',
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(7)
  @IsOptional()
  jourSemaine?: number;

  @ApiProperty({ example: '09:30', required: false })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Heure attendue au format HH:mm.',
  })
  @IsOptional()
  heure?: string;
}
