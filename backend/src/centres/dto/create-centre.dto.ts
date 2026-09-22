import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCentreDto {
  @ApiProperty({ example: 'Centre de Bamako' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Bamako' })
  @IsString()
  ville: string;

  @ApiProperty({ example: 'ACI 2000, Rue 300', required: false })
  @IsString()
  @IsOptional()
  adresse?: string;

  @ApiProperty({ example: '+223 20 00 00 01', required: false })
  @IsString()
  @IsOptional()
  telephone?: string;
}
