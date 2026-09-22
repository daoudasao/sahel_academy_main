import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class MediaDto {
  @IsString() type: string;
  @IsString() url: string;
  @IsString() @IsOptional() nom?: string;
}

class ActionDto {
  @IsString() label: string;
  @IsString() cible: string;
}

export class CreatePostDto {
  @ApiProperty({ example: 'Nouvelle publication !' })
  @IsString()
  contenu: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  auteurId?: string;

  @ApiProperty({ example: 'Sahel Academy' })
  @IsString()
  auteurNom: string;

  @ApiProperty({ example: 'Admin', required: false })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  documentNom?: string;

  @ApiProperty({ type: [MediaDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  medias?: MediaDto[];

  @ApiProperty({ type: [ActionDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions?: ActionDto[];
}
