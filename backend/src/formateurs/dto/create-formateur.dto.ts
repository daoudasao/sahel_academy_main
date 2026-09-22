import { IsString, IsOptional, IsNumber, IsBoolean, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFormateurDto {
  @ApiProperty({ example: 'M. Diallo' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'diallo@sahel-academy.org', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+223 70 00 11 22', required: false })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiProperty({ example: 'Développement Web', required: false })
  @IsString()
  @IsOptional()
  specialite?: string;

  @ApiProperty({ example: 150000, required: false })
  @IsNumber()
  @IsOptional()
  salaireMensuel?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  actif?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userId?: string;
}
