import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentaireDto {
  @ApiProperty({ example: 'Merci pour cette annonce !' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  contenu: string;

  @ApiProperty({ required: false, description: 'Commentaire auquel on répond' })
  @IsString()
  @IsOptional()
  parentId?: string;

  /** Nom affiché : pris en compte uniquement pour l'équipe. */
  @ApiProperty({ required: false, example: 'Sahel Academy' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  auteur?: string;

  /** Ignoré : le rôle affiché est déduit du compte connecté. */
  @ApiProperty({ required: false, deprecated: true })
  @IsString()
  @IsOptional()
  role?: string;
}
