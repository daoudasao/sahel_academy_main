import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVersementDto {
  @ApiProperty({ example: 50000 })
  @IsNumber()
  montant: number;

  @ApiProperty({ required: false, example: '2026-08-10T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ required: false, example: 'Virement bancaire' })
  @IsString()
  @IsOptional()
  note?: string;
}
