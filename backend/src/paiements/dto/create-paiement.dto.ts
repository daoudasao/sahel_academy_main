import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaiementDto {
  @ApiProperty({ example: 25000 })
  @IsNumber()
  montant: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  note?: string;
}
