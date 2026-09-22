import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  /** Nom affiché : choisi par l'équipe ; un formateur publie sous son propre nom. */
  @ApiProperty({ required: false, example: 'M. Diallo' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  auteurNom?: string;

  /** Libellé du rôle : choisi par l'équipe ; « Formateur » pour un formateur. */
  @ApiProperty({ required: false, example: 'Formateur' })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  auteurRole?: string;

  @ApiProperty({ example: 'Bonjour à tous, voici le programme de la semaine.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  contenu: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  documentNom?: string;
}
