import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartementDto {
  @ApiProperty({ example: 'Département Informatique' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Cours liés au développement et réseaux', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
