import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Compte de connexion d'un formateur (le rôle FORMATEUR est imposé). */
export class CreateCompteFormateurDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nom: string;

  @ApiProperty()
  @IsEmail({}, { message: "L'adresse e-mail est invalide." })
  email: string;

  /** Même longueur minimale que better-auth pour l'inscription. */
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  @MaxLength(128)
  motDePasse: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string;
}
