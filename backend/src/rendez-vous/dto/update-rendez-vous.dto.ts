import { ApiProperty } from '@nestjs/swagger';
import { StatutRendezVous } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRendezVousDto {
  @ApiProperty({ enum: StatutRendezVous, required: false })
  @IsEnum(StatutRendezVous, { message: 'Statut de rendez-vous inconnu.' })
  @IsOptional()
  statut?: StatutRendezVous;

  @ApiProperty({ required: false, description: 'Note interne de l’équipe' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  noteAdmin?: string;
}
