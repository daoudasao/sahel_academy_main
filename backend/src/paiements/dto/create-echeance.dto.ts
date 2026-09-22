import { IsString, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEcheanceDto {
  @ApiProperty({ example: 'usr_123' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'form_123' })
  @IsString()
  formationId: string;

  @ApiProperty({ example: 'Frais d\'inscription Septembre' })
  @IsString()
  libelle: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  montantDu: number;

  @ApiProperty({ example: '2026-09-01T00:00:00Z' })
  @IsDateString()
  dateEcheance: string;
}
