import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInscriptionDto {
  @ApiProperty({ example: 'formation_id_123' })
  @IsString()
  formationId: string;
}
