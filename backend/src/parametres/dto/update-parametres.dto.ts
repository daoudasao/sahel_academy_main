import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, Matches } from 'class-validator';

export class UpdateParametresDto {
  @ApiProperty({ example: '+223 71 49 31 77', required: false })
  @Matches(/^\+?[0-9][0-9 .()-]{6,24}$/, {
    message:
      'Numéro WhatsApp invalide : chiffres uniquement, avec l’indicatif (ex. +223 71 49 31 77).',
  })
  @IsOptional()
  whatsappSupport?: string;

  @ApiProperty({ example: 'contact@sahelacademy.org', required: false })
  @IsEmail({}, { message: 'E-mail du support invalide.' })
  @IsOptional()
  emailSupport?: string;
}
