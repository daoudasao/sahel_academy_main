import { IsString, IsEmail, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCandidatureDto {
  /**
   * Ignoré : le candidat est toujours l'utilisateur connecté.
   * Conservé (optionnel) pour ne pas rejeter les versions de l'app qui
   * l'envoient encore.
   */
  @ApiProperty({ required: false, deprecated: true })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    required: false,
    example: 'Fatou Sow',
    description: 'Par défaut : le nom du compte',
  })
  @IsString()
  @IsOptional()
  nom?: string;

  @ApiProperty({
    required: false,
    example: 'fatou@example.com',
    description: "Par défaut : l'e-mail du compte",
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false, type: Object })
  @IsObject()
  @IsOptional()
  reponses?: Record<string, unknown>;
}
