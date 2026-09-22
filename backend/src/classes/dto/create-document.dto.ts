import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Support de cours - Séance 1' })
  @IsString()
  titre: string;

  @ApiProperty({ required: false, example: 'PDF' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiProperty({ required: false, example: '1,2 Mo' })
  @IsString()
  @IsOptional()
  taille?: string;
}
