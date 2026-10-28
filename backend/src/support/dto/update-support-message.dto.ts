import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSupportMessageDto {
  @ApiProperty({ example: 'Bonjour, voici la réponse corrigée.' })
  @IsString()
  @IsNotEmpty()
  contenu: string;
}
