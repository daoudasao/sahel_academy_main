import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCentreDto {
  @ApiProperty({ example: 'Centre de Bamako' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Bamako' })
  @IsString()
  ville: string;

  @ApiProperty({ example: 'ACI 2000, Rue 300', required: false })
  @IsString()
  @IsOptional()
  adresse?: string;

  @ApiProperty({ example: '+223 20 00 00 01', required: false })
  @IsString()
  @IsOptional()
  telephone?: string;

  // ─── Localisation (bouton « Itinéraire » de l'app) ───
  // null = effacer la valeur enregistrée.

  @ApiProperty({ example: 12.6392, required: false, nullable: true })
  @IsNumber({}, { message: 'La latitude doit être un nombre.' })
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number | null;

  @ApiProperty({ example: -8.0029, required: false, nullable: true })
  @IsNumber({}, { message: 'La longitude doit être un nombre.' })
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number | null;

  @ApiProperty({
    example: 'https://maps.app.goo.gl/xxxx',
    required: false,
    nullable: true,
  })
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'Le lien Google Maps doit être une adresse web (https://…).' },
  )
  @MaxLength(500)
  @IsOptional()
  lienMaps?: string | null;
}
