import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentaireClasseDto {
  /** Nom affiché : pris en compte uniquement pour l'équipe. */
  @ApiProperty({ required: false, example: 'Awa Traoré' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  auteur?: string;

  /** Ignoré : le rôle affiché est déduit du compte connecté. */
  @ApiProperty({ required: false, deprecated: true })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({ example: 'Merci pour l’info !' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  contenu: string;
}
