import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Réinitialisation du mot de passe d'un utilisateur par un administrateur. */
export class SetPasswordDto {
  @ApiProperty({ example: 'NouveauMotDePasse123', minLength: 8 })
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères.',
  })
  newPassword: string;
}
