import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupportMessageDto {
  @ApiProperty({ example: 'Bonjour, j’ai une question sur mon paiement.' })
  @IsString()
  contenu: string;

  @ApiProperty({ example: 'texte', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ example: 'https://cdn.sahel.com/support/vocal.m4a', required: false })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiProperty({ example: 12, required: false })
  @IsOptional()
  @IsNumber()
  dureeSeconds?: number;

  @ApiProperty({ example: 'https://cdn.sahel.com/docs/admission.pdf', required: false })
  @IsOptional()
  @IsString()
  documentUrl?: string;

  @ApiProperty({ example: 'Attestation_Admission.pdf', required: false })
  @IsOptional()
  @IsString()
  documentNom?: string;
}
