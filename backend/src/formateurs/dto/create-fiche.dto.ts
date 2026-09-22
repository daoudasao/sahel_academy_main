import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFicheDto {
  @ApiProperty({ example: 'Août 2026' })
  @IsString()
  mois: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  montantDu: number;
}
