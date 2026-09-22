import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Champs qu'un utilisateur peut modifier **sur son propre compte**.
 *
 * Volontairement distinct de `UpdateUserDto` (reserve aux admins) : celui-ci
 * expose `role` et `actif`, qu'un utilisateur ne doit pas pouvoir se donner.
 * L'e-mail est exclu aussi — il est gere par better-auth, pas par ce endpoint.
 */
export class UpdateProfilDto {
  @ApiProperty({ example: 'Jean Dupont', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  nom?: string;

  /** Alias envoye par l'app Flutter. */
  @ApiProperty({ example: 'Jean Dupont', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @ApiProperty({ example: '+223 70 00 11 22', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9][0-9\s().-]{7,19}$/, {
    message: 'Le numero de telephone est invalide.',
  })
  telephone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  /** Alias envoye par l'app Flutter. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image?: string;
}
