import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRendezVousDto {
  @ApiProperty({ description: 'Créneau choisi dans un centre' })
  @IsString()
  @MinLength(1)
  creneauId: string;

  @ApiProperty({ example: 'Dépôt de dossier', required: false })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  motif?: string;
}
